import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Event Watch — Smart Contract Event Listener",
  description:
    "Paste any smart contract address, auto-fetch the ABI, and view a live feed of decoded events.",
};

const themeScript = `(function(){
  var s=localStorage.getItem('theme');
  var d=window.matchMedia('(prefers-color-scheme:dark)').matches;
  var k=s==='dark'||(!s&&d);
  document.documentElement.classList.toggle('dark',k);
  document.documentElement.style.colorScheme=k?'dark':'light';
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}
      >
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 pb-12 pt-8 sm:px-8">
          {/* Header */}
          <header className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo mark — stylized radar/pulse */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-accent">
                  <path d="M9 1v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M1 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                  <circle cx="9" cy="9" r="1" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h1 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                  Event Watch
                </h1>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted">
                  Contract Event Listener
                </p>
              </div>
            </div>
            <ThemeToggle />
          </header>

          {/* Accent line */}
          <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="mt-16 border-t border-border pt-6 pb-2">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              {/* Brand */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10">
                  <svg width="12" height="12" viewBox="0 0 18 18" fill="none" className="text-accent">
                    <path d="M9 1v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M1 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                    <circle cx="9" cy="9" r="1" fill="currentColor" />
                  </svg>
                </div>
                <span className="font-display text-[12px] font-medium text-muted">
                  Event Watch
                </span>
                <span className="text-border">·</span>
                <span className="text-[11px] text-muted/60">
                  Decode smart contract events
                </span>
              </div>

              {/* Social */}
              <a
                href="https://x.com/marvel_codes"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-foreground"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                @marvel_codes
              </a>
            </div>

            {/* Copyright */}
            <p className="mt-5 text-center text-[10px] text-muted/40">
              &copy; {new Date().getFullYear()} Event Watch. Powered by Etherscan.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
