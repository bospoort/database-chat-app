import sql from "mssql";
import { GoogleGenAI } from "@google/genai";
import { dbConfig, ALLOWED_TABLES, DANGEROUS_KEYWORDS, AI_MODEL } from "../config.js";

function validateQuery(query) {
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

async function getDatabaseSchema() {
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

  const schema = {};
  result.recordset.forEach((row) => {
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

async function executeQuery(query) {
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
      error: error.message,
    };
  }
}

async function callGemini(userMessage, schema) {
  // The client gets the API key from the environment variable `GEMINI_API_KEY`.
  const ai = new GoogleGenAI({});

  const systemPrompt = `You are a database assistant for Microsoft SQL Server. Generate T-SQL queries. Whenever you encounter a foreign key, resolve to the referenced table. Here is the schema:
${JSON.stringify(schema, null, 2)}

Rules:
1. Only SELECT queries
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
  console.log("Gemini response data:", response.text);
  return response.text;
}

function extractSqlQuery(aiResponse) {
  const sqlMatch = aiResponse.match(/```sql\n([\s\S]*?)```/);
  return sqlMatch ? sqlMatch[1].trim() : null;
}

// ES module export
export default async function (context, req) {
  context.log("Chat function triggered");

  try {
    const message = req.body?.message;

    if (!message) {
      context.res = {
        status: 400,
        body: { error: "Message is required" },
      };
      return;
    }

    const schema = await getDatabaseSchema();
    const aiResponse = await callGemini(message, schema);
    const sqlQuery = extractSqlQuery(aiResponse);

    let queryResult = null;
    if (sqlQuery) {
      queryResult = await executeQuery(sqlQuery);
    }

    console.log("AI Response:", aiResponse, sqlQuery, queryResult);
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { aiResponse, sqlQuery, queryResult },
    };
  } catch (error) {
    context.log.error("Error:", error);
    context.res = {
      status: 500,
      body: { error: error.message },
    };
  }
}
