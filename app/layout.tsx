import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "City Game Stiavnica",
  description: "Rebuild shell for the City Game Stiavnica app."
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
