import { redirect } from "next/navigation";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ensureBlogBootstrap, getUserByEmail } from "@/lib/community";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isSameCredential, normalizeSingleLine } from "@/lib/security";

// This project uses a single admin account from environment variables.
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.warn("ADMIN_EMAIL or ADMIN_PASSWORD is not set. Admin login will not work.");
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 15,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Normalize user input before comparing credentials.
        const email = normalizeSingleLine(String(credentials?.email ?? "")).toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!adminEmail || !adminPassword) {
          return null;
        }

        // Lightweight anti-bruteforce guard.
        enforceRateLimit(`login:${email}`, 8, 10 * 60 * 1000, "Too many login attempts. Wait a bit.");

        // timingSafeEqual-based comparison to avoid leaking compare timing.
        if (!isSameCredential(email, adminEmail) || !isSameCredential(password, adminPassword)) {
          return null;
        }

        await ensureBlogBootstrap();

        const user = await getUserByEmail(email);

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.sub = user.id;
      }

      token.isAdmin = token.email === adminEmail;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.id = token.sub;
        session.user.isAdmin = Boolean(token.isAdmin);
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

export async function requireAdminSession() {
  const session = await auth();

  // Redirect non-admin visitors to login.
  if (!session?.user?.email || !session.user.isAdmin) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminUser() {
  const session = await requireAdminSession();
  const email = session.user.email;

  if (!email) {
    redirect("/login");
  }

  // Fetch persisted user row for actions that need DB user id.
  const user = await getUserByEmail(email);

  if (!user) {
    redirect("/login");
  }

  return user;
}
