// src/utils/db.ts
import sql from "mssql";
import { DB_CONFIG } from "@/config/config";

export async function getConnection(): Promise<sql.ConnectionPool> {
  return sql.connect(DB_CONFIG);
}

export default sql;
