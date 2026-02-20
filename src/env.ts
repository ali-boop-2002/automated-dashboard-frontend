// Strip trailing slash to avoid double slashes (e.g. baseUrl + "/properties" -> "//properties")
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "") || url;
}

export const env = {
  VITE_API_BASE_URL: normalizeBaseUrl(
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
  ),
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
};
