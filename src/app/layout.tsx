import "./globals.css";
import "./ui.css";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: "Depart",
  description: "Arrive right - no stress, no missed flights.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <meta name="color-scheme" content="dark light" />
      </head>
      <body className={jakarta.className}>
        <div className="bg-clouds" aria-hidden="true" />
        <div className="bg-orbs" aria-hidden="true">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
        </div>
        <div className="site">{children}</div>
      </body>
    </html>
  );
}
