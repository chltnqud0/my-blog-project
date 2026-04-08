import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soobyeong Blog",
  description: "A tag-based blog starter built with Next.js, Prisma, and Postgres.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await auth();
  const isAdmin = Boolean(session?.user?.isAdmin);

  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <header className="site-header">
          <div className="site-header__inner">
            <Link href="/" className="brand">
              SOOBYEONG BLOG
            </Link>
            <nav className="site-nav">
              <Link href="/">All Posts</Link>
              {isAdmin ? <Link href="/posts/new">Write</Link> : <Link href="/login">Login</Link>}
              {isAdmin ? <Link href="/comments">Comments</Link> : null}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
