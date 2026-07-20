import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolPro Uganda | #1 School Management System & Report Card Generator",
  description: "Transform your school operations with Uganda's leading school software. Generate UNEB PLE & NLSC Competency-Based (CBC) report cards instantly, track school fees payments, manage staff accounts, and streamline parent communication. Get started for free today!",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/logo.png",
  },
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
    "SchoolPro Uganda",
    "competency based assessment software"
  ],
  authors: [{ name: "Lapter Technologies", url: "https://portal.laptertech.store" }],
  creator: "Lapter Technologies",
  publisher: "Lapter Technologies",
  metadataBase: new URL("https://portal.laptertech.store"),
  alternates: {
    canonical: "https://portal.laptertech.store",
  },
  verification: {
    google: "PqY6kMI7Z4NIwtkIup3RuvErwFFDUNFdhtSpL_dVnFw",
  },
  openGraph: {
    title: "SchoolPro Uganda | #1 School Management System & Report Card Generator",
    description: "Transform your school operations with Uganda's leading school software. Generate PLE & NLSC CBC report cards instantly, track fees, and streamline administration.",
    url: "https://portal.laptertech.store",
    siteName: "SchoolPro Uganda",
    locale: "en_UG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SchoolPro Uganda | #1 School Management System & Report Card Generator",
    description: "Transform your school operations with Uganda's leading school software. Generate PLE & NLSC CBC report cards instantly, track fees, and streamline administration.",
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

import { Toaster } from 'react-hot-toast';

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
      <body>
        {children}
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
