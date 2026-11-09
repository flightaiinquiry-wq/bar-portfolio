import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${site.name} | ${site.role}`,
  description: site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={interTight.variable}>
      <body data-preloading="true">
        <noscript>
          <style>{`body[data-preloading=true] .content{opacity:1;visibility:visible;pointer-events:auto}.split:not(.is-visible) .word,.blur-anim:not(.is-visible) .char{opacity:1;transform:none;filter:none}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
