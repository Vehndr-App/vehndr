const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vehndr.com";

/**
 * Tells Google, Bing, and AI crawlers what they may index.
 * Private dashboards stay out of search results.
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/buyer-dashboard",
          "/coordinator-dashboard",
          "/admin",
          "/messages",
          "/checkout",
          "/cart",
          "/orders",
          "/appointments",
          "/notifications",
          "/profile",
          "/favorites",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
