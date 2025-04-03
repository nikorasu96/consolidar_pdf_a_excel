// app/layout.tsx
import Head from "next/head";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

export const metadata = {
  title: "Convertidor PDF a EXCEL",
  description: "Next.js 13 + TypeScript + Bootstrap + PDF to Excel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <Head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        {/* Carga la fuente Open Sans desde Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body style={{ fontFamily: '"Open Sans", sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
