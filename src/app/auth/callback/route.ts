import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const origin = requestUrl.origin;

  // If Supabase / Google returns an error parameter in the URL query string
  if (error || errorDescription) {
    console.error("OAuth callback error from provider:", error, errorDescription);
    const friendlyMessage =
      error === "access_denied"
        ? "Google sign-in was cancelled or access was denied."
        : errorDescription || "Google sign-in could not be completed. Please try again.";

    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(friendlyMessage)}`);
  }

  // Handle PKCE authorization code exchange
  if (code) {
    const supabase = createClient();

    // Check if session is already established (e.g. prior exchange or active session)
    const {
      data: { session: existingSession },
    } = await supabase.auth.getSession();
    if (existingSession) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } else {
      console.error("Supabase code exchange error:", exchangeError);

      // Check if session succeeded despite error report (e.g. duplicate prefetch request)
      const {
        data: { session: postSession },
      } = await supabase.auth.getSession();
      if (postSession) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const detailedMessage = exchangeError.message
        ? `Google sign-in error: ${exchangeError.message}`
        : "Google authentication session exchange failed. Please try signing in again.";

      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(detailedMessage)}`
      );
    }
  }

  // Fallback for callback hits without code or error
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Google sign-in could not be completed. Please try again.")}`
  );
}

