import type { Metadata } from "next";

// Dynamic per-school SEO using generateMetadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;

  // Capitalise the subdomain for the title
  const schoolName = subdomain
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${schoolName} | School Portal — SchoolPro Uganda`,
    description: `Access the ${schoolName} school management portal. View report cards, academic results, fee statements and staff dashboards powered by SchoolPro Uganda.`,
    robots: {
      // School portals are private — don't index individual school subpages
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    openGraph: {
      title: `${schoolName} | School Portal`,
      description: `${schoolName} secure school management portal — powered by SchoolPro Uganda.`,
      type: "website",
    },
  };
}

export default function SchoolPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
