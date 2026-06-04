import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolPro Uganda | School Management System for Primary & Secondary Schools",
  description: "Purpose-built school management software for Ugandan primary and secondary schools. Generate PLE & CBC report cards, manage finances, track tuition payments — all in one place.",
  keywords: [
    "school management system Uganda",
    "PLE report cards Uganda",
    "CBC report cards Uganda",
    "Uganda school software",
    "primary school management Uganda",
    "secondary school management Uganda",
    "UNEB PLE grading system",
    "lower secondary curriculum CBC",
    "school fees management Uganda",
    "SchoolPro Uganda"
  ],
  authors: [{ name: "Lapter Technologies", url: "https://portal.laptertech.store" }],
  creator: "Lapter Technologies",
  publisher: "Lapter Technologies",
  metadataBase: new URL("https://portal.laptertech.store"),
  alternates: {
    canonical: "https://portal.laptertech.store",
  },
  verification: {
    google: "B-3NHVG-ZJQ7AHtCzKVxVIGPTR1qcacEtikgxGOapZs",
  },
  openGraph: {
    title: "SchoolPro Uganda | School Management System",
    description: "Generate PLE & CBC report cards, manage school finances, and track tuition payments — purpose-built for Ugandan schools.",
    url: "https://portal.laptertech.store",
    siteName: "SchoolPro Uganda",
    locale: "en_UG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SchoolPro Uganda | School Management System",
    description: "Generate PLE & CBC report cards, manage school finances, and track tuition payments — purpose-built for Ugandan schools.",
    creator: "@laptertech",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
