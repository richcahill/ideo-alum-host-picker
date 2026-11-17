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
          <header className="mb-16 flex select-none flex-wrap items-center justify-between gap-x-8 gap-y-3 text-sm">
            <Link href="/" className="font-medium">
              IDEO alumni meetup
            </Link>
            <span className="flex items-center gap-5 text-muted">
              <a
                href="https://shop.richmak.es"
                target="_blank"
                rel="noreferrer"
                aria-label="Rich's shop (opens in a new tab)"
                title="Rich's shop"
                className="-m-2 p-2 hover:text-foreground"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="h-4 w-4"
                >
                  <path d="M5 8h14l-1 12H6L5 8z" />
                  <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
                </svg>
              </a>
              <ThemeToggle className="font-mono text-[11px] tracking-[0.05em]" />
            </span>
          </header>
          <main className="flex-1 pb-24">{children}</main>
          <footer className="border-t border-rule py-8 text-sm text-muted">
            Made by Rich, who is also selling almost everything he owns at{" "}
            <a
              href="https://shop.richmak.es"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline decoration-rule underline-offset-4 hover:decoration-current"
            >
              shop.richmak.es ↗
            </a>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
