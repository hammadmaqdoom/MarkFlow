import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TRPCProvider } from "@/trpc/Provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "MarkFlow",
  description: "The Founder's Growth Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-bg text-text min-h-screen`}
      >
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
