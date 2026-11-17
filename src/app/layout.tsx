import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

// Runs before first paint so the page never flashes the wrong theme: the
// visitor's saved choice wins, otherwise their system setting, which is then
// followed live until they choose.
const THEME_SCRIPT = `(function(){var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)"),s=null;try{s=localStorage.getItem("theme")}catch(e){}function set(){d.dataset.theme=s==="light"||s==="dark"?s:m.matches?"dark":"light"}set();m.addEventListener("change",function(){try{s=localStorage.getItem("theme")}catch(e){}set();dispatchEvent(new Event("theme-change"))})})()`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "IDEO alumni meetup",
    template: "%s · IDEO alumni meetup",
  },
  description: "Who is organizing the next IDEO alumni meetup, and who has.",
  robots: { index: false, follow: false },
};

// Browser chrome and the status bar match the page in each scheme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pt-12 sm:pt-20">
          <header className="mb-16 flex select-none flex-wrap items-baseline justify-between gap-x-8 gap-y-3 text-sm">
            <Link href="/" className="font-medium">
              IDEO alumni meetup
            </Link>
            <ThemeToggle className="font-mono text-[11px] tracking-[0.05em] text-muted" />
          </header>
          <main className="flex-1 pb-24">{children}</main>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
