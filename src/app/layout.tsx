// src/app/layout.tsx
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
      </Head>
      <body>{children}</body>
    </html>
  );
}
