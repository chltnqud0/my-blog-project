import { prisma } from "@/lib/prisma";

export const COMMENT_MAX_LENGTH = 500;

function getAdminSeedUser() {
  const email = process.env.ADMIN_EMAIL?.trim() || "admin@example.com";
  const usernameBase = email.split("@")[0]?.trim() || "admin";

  return {
    email,
    username: usernameBase.toLowerCase().replace(/[^a-z0-9_-]/g, "") || "admin",
    displayName: "Soobyeong",
    passwordHash: "managed-by-auth-config",
  };
}

function getGuestSeedUser() {
  return {
    email: "guest@soobyeong.blog",
    username: "guest_reader",
    displayName: "Guest Reader",
    passwordHash: "guest-reader-account",
  };
}

const DEFAULT_TAGS = [
  { name: "Next.js", slug: "nextjs", description: "Next.js related posts" },
  { name: "Prisma", slug: "prisma", description: "Prisma related posts" },
  { name: "Docker", slug: "docker", description: "Docker related posts" },
  { name: "Essay", slug: "essay", description: "Notes and essays" },
] as const;

// Prevent repeated upsert work on every request in the same server process.
let bootstrapPromise: Promise<void> | null = null;

export async function ensureBlogBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const adminUser = getAdminSeedUser();
      const guestUser = getGuestSeedUser();

      await prisma.user.upsert({
        where: { email: adminUser.email },
        update: {
          username: adminUser.username,
          displayName: adminUser.displayName,
          passwordHash: adminUser.passwordHash,
        },
        create: adminUser,
      });

      await prisma.user.upsert({
        where: { email: guestUser.email },
        update: {
          username: guestUser.username,
          displayName: guestUser.displayName,
          passwordHash: guestUser.passwordHash,
        },
        create: guestUser,
      });

      // Seed a small default tag set for first-run UX.
      await Promise.all(
        DEFAULT_TAGS.map((tag) =>
          prisma.tag.upsert({
            where: { slug: tag.slug },
            update: {},
            create: tag,
          }),
        ),
      );
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  await bootstrapPromise;
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export function slugify(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createUniquePostSlug(title: string, ignorePostId?: string) {
  const baseSlug = slugify(title) || `post-${Date.now()}`;
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    // Keep trying suffixes until we find a unique slug.
    const existing = await prisma.post.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === ignorePostId) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

export function parseTagNames(input: string) {
  return [...new Set(input.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
