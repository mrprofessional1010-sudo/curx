import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Create Account — CURX Clinical Intelligence Workspace",
  description: "Create your CURX account to connect medication and clinical intelligence.",
};

export default function SignupPage() {
  return <AuthShell initialMode="signup" />;
}
