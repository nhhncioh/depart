import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Depart",
  description: "Arrive right — no stress, no missed flights.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
