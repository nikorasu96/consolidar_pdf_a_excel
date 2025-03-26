// src/app/layout.tsx

// Importación de estilos de Bootstrap y estilos globales personalizados.
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

// Metadatos de la aplicación que pueden ser utilizados en el HTML para SEO, título, descripción, etc.
export const metadata = {
  title: "My Next Project",
  description: "Next.js 13 + TypeScript + Bootstrap + PDF to Excel",
};

/**
 * Componente de layout raíz que envuelve toda la aplicación.
 * Recibe los children (componentes hijos) y los renderiza dentro de la estructura HTML básica.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
