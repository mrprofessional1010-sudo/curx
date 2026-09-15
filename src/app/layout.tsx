import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "CURX — Clinical Risk Intelligence & Medication Decision Support",
  description:
    "Curx connects symptoms, medications, genetics, and evidence into an explainable, deterministic understanding of clinical risk.",
  keywords: [
    "Clinical decision support",
    "Medication intelligence",
    "Pharmacogenomics",
    "Drug interactions",
    "Evidence-linked risk",
  ],
  authors: [{ name: "CURX Intelligence Engine" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-graphite text-[#EDF2F7] antialiased selection:bg-curx-cyan/30 selection:text-curx-cyan min-h-screen">
        {/* Subtle global atmosphere */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1100px] h-[750px] bg-gradient-to-b from-curx-cyan/[0.035] via-transparent to-transparent blur-[160px] rounded-full"></div>
          <div className="absolute top-[45%] -left-[10%] w-[600px] h-[600px] bg-curx-cyan/[0.015] blur-[160px] rounded-full"></div>
          <div className="absolute top-[70%] -right-[10%] w-[700px] h-[700px] bg-curx-orange/[0.015] blur-[180px] rounded-full"></div>
          <div className="absolute inset-0 grid-glow opacity-25"></div>
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
