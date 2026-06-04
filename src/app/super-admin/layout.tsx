import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Super Admin Console | SchoolPro Uganda",
  description: "Lapter Technologies internal super-admin dashboard for managing SchoolPro Uganda school subscriptions, billing, and tenants.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
