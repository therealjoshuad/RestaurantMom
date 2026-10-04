import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RestaurantMom",
  description: "Remembers every dish you have ordered",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="gingham min-h-full flex flex-col">{children}</body>
    </html>
  );
}
