import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Sign In — CURX Clinical Intelligence Workspace",
  description: "Sign in to access your CURX clinical decision support workspace.",
};

export default function LoginPage() {
  return <AuthShell initialMode="login" />;
}
