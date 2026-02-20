import { supabase } from "./supabase";
import { env } from "@/env";

export const API_BASE_URL = env.VITE_API_BASE_URL;

/**
 * Authenticated fetch wrapper that includes the Supabase auth token
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Helper to get auth headers for manual fetch calls
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }

  return {};
}
