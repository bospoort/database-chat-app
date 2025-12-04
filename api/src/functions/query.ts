import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import * as sql from "mssql";
import { GoogleGenAI } from "@google/genai";
import {
  dbConfig,
  ALLOWED_TABLES,
  DANGEROUS_KEYWORDS,
  AI_MODEL,
} from "../config";
import { initializeTelemetry, trackQuery } from "../telemetry";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

interface DatabaseSchema {
  [tableName: string]: ColumnInfo[];
}

interface QueryResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  error?: string;
}

interface ChatRequestBody {
  message?: string;
}

interface UserInfo {
  userId: string;
  userLogin: string;
  userProvider: string;
}

function extractUserInfo(request: HttpRequest): UserInfo {
  // Azure Static Web Apps injects user info in the x-ms-client-principal header
  const principalHeader = request.headers.get("x-ms-client-principal");

  if (principalHeader) {
    try {
      // The header is base64 encoded
      const decoded = Buffer.from(principalHeader, "base64").toString("utf-8");
      const principal = JSON.parse(decoded);

      return {
        userId: principal.userId || "unknown",
        userLogin: principal.userDetails || principal.userId || "unknown",
        userProvider: principal.identityProvider || "unknown",
      };
    } catch (error) {
      console.error("Failed to parse user principal:", error);
    }
  }

  // Fallback: no authentication or parsing failed
  return {
    userId: "anonymous",
    userLogin: "anonymous",
    userProvider: "none",
  };
}

function isModifyingQuery(query: string): boolean {
  const upperQuery = query.toUpperCase().trim();
  return (
    upperQuery.startsWith("UPDATE") ||
    upperQuery.startsWith("INSERT") ||
    upperQuery.startsWith("DELETE")
  );
}

function validateQuery(query: string): boolean {
  const upperQuery = query.toUpperCase().trim();

  if (!upperQuery.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed");
  }

  for (const keyword of DANGEROUS_KEYWORDS) {
    if (upperQuery.includes(keyword)) {
      throw new Error(`Keyword "${keyword}" is not allowed`);
    }
  }

  return true;
}

async function getDatabaseSchema(): Promise<DatabaseSchema> {
  const pool = await sql.connect(dbConfig);

  const result = await pool.request().query(`
    SELECT t.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE
    FROM INFORMATION_SCHEMA.TABLES t
    INNER JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
    WHERE t.TABLE_TYPE = 'BASE TABLE'
      AND t.TABLE_NAME IN (${ALLOWED_TABLES.map((t) => `'${t}'`).join(",")})
    ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
  `);

  await pool.close();

  const schema: DatabaseSchema = {};
  result.recordset.forEach((row: any) => {
    if (!schema[row.TABLE_NAME]) {
      schema[row.TABLE_NAME] = [];
    }
    schema[row.TABLE_NAME].push({
      name: row.COLUMN_NAME,
      type: row.DATA_TYPE,
      nullable: row.IS_NULLABLE === "YES",
    });
  });

  return schema;
}

async function executeQuery(query: string): Promise<QueryResult> {
  try {
    validateQuery(query);
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(query);
    await pool.close();

    return {
      success: true,
      data: result.recordset,
      rowCount: result.recordset.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function callGemini(
  userMessage: string,
  schema: DatabaseSchema
): Promise<string> {
  // The client gets the API key from the environment variable `GEMINI_API_KEY`.
  const ai = new GoogleGenAI({});

  const systemPrompt = `You are a database assistant for Microsoft SQL Server. Generate T-SQL queries. Whenever you encounter a foreign key, resolve to the referenced table. Here is the schema:
${JSON.stringify(schema, null, 2)}

Rules:
1. Generate SELECT, UPDATE, INSERT, or DELETE queries as appropriate for the user's request
2. Only these tables: ${ALLOWED_TABLES.join(", ")}
3. Use SQL Server syntax (TOP instead of LIMIT, etc.)
4. Wrap SQL in \`\`\`sql\`\`\` blocks`;

  const response = await ai.models.generateContent({
    model: AI_MODEL,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
    },
  });
  console.log("Gemini response datas:", response.text);
  return response.text || "";
}

function extractSqlQuery(aiResponse: string): string | null {
  const sqlMatch = aiResponse.match(/```sql\n([\s\S]*?)```/);
  return sqlMatch ? sqlMatch[1].trim() : null;
}

export async function query(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("Chat function triggered");

  // Initialize Application Insights
  initializeTelemetry();

  // Extract user information
  const userInfo = extractUserInfo(request);
  context.log(`User: ${userInfo.userLogin} (${userInfo.userProvider})`);

  const startTime = Date.now();

  try {
    const body = (await request.json()) as ChatRequestBody;
    const message = body?.message;

    if (!message) {
      return {
        status: 400,
        jsonBody: { error: "Message is required" },
      };
    }

    const schema = await getDatabaseSchema();
    let aiResponse = await callGemini(message, schema);
    const sqlQuery = extractSqlQuery(aiResponse);

    console.log("Extracted SQL Query:", sqlQuery);

    let queryResult: QueryResult | null = null;
    let wasModifyingQuery = false;

    if (sqlQuery) {
      // Check if this is a modifying query (UPDATE, INSERT, DELETE)
      if (isModifyingQuery(sqlQuery)) {
        wasModifyingQuery = true;
        // Don't execute the query, just return it with a warning message
        aiResponse = `I'm sorry, Dave, I can't do that, but here is the query:\n\n\`\`\`sql\n${sqlQuery}\n\`\`\`\n\nThis query would modify the database, so it won't be executed automatically. If you need to run this query, please execute it manually through a secure database management interface.`;
        queryResult = {
          success: false,
          error:
            "Query not executed: Modifying queries (UPDATE, INSERT, DELETE) are not automatically executed for safety reasons.",
        };
      } else {
        // Execute SELECT queries normally
        queryResult = await executeQuery(sqlQuery);
      }
    }

    const responseTime = Date.now() - startTime;

    // Track telemetry
    trackQuery({
      userMessage: message,
      aiResponse,
      sqlQuery,
      querySuccess: queryResult?.success ?? false,
      queryError: queryResult?.error,
      rowCount: queryResult?.rowCount,
      responseTimeMs: responseTime,
      wasModifyingQuery,
      userId: userInfo.userId,
      userLogin: userInfo.userLogin,
      userProvider: userInfo.userProvider,
    });

    console.log("AI Response:", aiResponse, sqlQuery, queryResult);
    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      jsonBody: { aiResponse, sqlQuery, queryResult },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Track failed request
    trackQuery({
      userMessage: "Error occurred",
      aiResponse: "",
      sqlQuery: null,
      querySuccess: false,
      queryError: error instanceof Error ? error.message : String(error),
      responseTimeMs: responseTime,
      wasModifyingQuery: false,
      userId: userInfo.userId,
      userLogin: userInfo.userLogin,
      userProvider: userInfo.userProvider,
    });

    context.error("Error:", error);
    return {
      status: 500,
      jsonBody: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

app.http("query", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: query,
});
