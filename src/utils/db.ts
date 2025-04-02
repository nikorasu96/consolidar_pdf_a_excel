import sql from "mssql";

const config: sql.config = {
  server: process.env.DB_SERVER || "192.168.0.90", // O tu nombre de host si está disponible
  database: process.env.DB_DATABASE || "PDFExcelDB",
  user: process.env.DB_USER || "ConvPDF",
  password: process.env.DB_PASSWORD || "ConvPDFy",
  options: {
    trustServerCertificate: true,
    // Si usas TLS, puedes configurar 'encrypt: true' según corresponda.
  },
};

export async function getConnection(): Promise<sql.ConnectionPool> {
  return sql.connect(config);
}

export default sql;
