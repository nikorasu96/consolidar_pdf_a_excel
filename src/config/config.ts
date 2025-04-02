// src/config/config.ts
import dotenv from "dotenv";

// Cargar variables de entorno (útil en desarrollo; en producción Next.js ya las expone)
dotenv.config();

export const DB_CONFIG = {
  server: process.env.DB_SERVER || "192.168.0.90", // Servidor de la base de datos
  database: process.env.DB_DATABASE || "PDFExcelDB", // Nombre de la base de datos
  user: process.env.DB_USER || "ConvPDF", // Usuario
  password: process.env.DB_PASSWORD || "ConvPDFy", // Contraseña
  options: {
    trustServerCertificate: true,
    // Si necesitas encriptación, activa la opción siguiente:
    // encrypt: true,
  },
};

export const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "5242880", 10); 
// Si NEXT_PUBLIC_MAX_FILE_SIZE no está definido, se usa 5MB (5242880 bytes) por defecto.
