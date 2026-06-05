import type { Metadata } from "next";

import { getSchoolBySubdomain } from "../../../lib/services";

// Dynamic per-school SEO using generateMetadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const resolvedParams = params ? await params : null;
  const subdomain = resolvedParams?.subdomain || "";

  // Capitalise the subdomain for the title
  const schoolName = subdomain
    ? subdomain
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "School";

  let iconUrl = "/favicon.png";
  try {
    const school = await getSchoolBySubdomain(subdomain);
    if (school && school.logoUrl && school.name !== "DB_ERROR_INDICATOR") {
      iconUrl = school.logoUrl;
    }
  } catch (err) {
    console.error("Error fetching school logo for metadata icons:", err);
  }

  return {
    title: `${schoolName} | School Portal — SchoolPro Uganda`,
    description: `Access the ${schoolName} school management portal. View report cards, academic results, fee statements and staff dashboards powered by SchoolPro Uganda.`,
    icons: {
      icon: iconUrl,
      shortcut: "/favicon.png",
      apple: iconUrl,
    },
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
