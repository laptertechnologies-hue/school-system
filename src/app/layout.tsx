import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolPro | Multi-Tenant Uganda School Management System",
  description: "A comprehensive SaaS platform for primary and secondary schools in Uganda. Manage academics (PLE & New Lower Secondary CBC), report card generation, and school financials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
