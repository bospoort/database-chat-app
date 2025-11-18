import { config as SqlConfig } from "mssql";

export const dbConfig: SqlConfig = {
  server: process.env.DB_SERVER as string,
  database: process.env.DB_DATABASE as string,
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  port: Number(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    enableArithAbort: true,
  },
};

export const ALLOWED_TABLES: readonly string[] = [
  "Buildings",
  "Categories",
  "Items",
  "Residents",
  "Transactions",
  "TransactionItems",
  "TransactionTypes",
  "Units",
  "Users",
] as const;

export const DANGEROUS_KEYWORDS: readonly string[] = [
  "DROP",
  "DELETE",
  "INSERT",
  "UPDATE",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "EXEC",
  "EXECUTE",
  "GRANT",
  "REVOKE",
] as const;

export const AI_MODEL = "gemini-2.5-flash" as const;
