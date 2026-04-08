import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@woori.blog" },
    update: {
      displayName: "Soobyeong",
    },
    create: {
      email: "demo@woori.blog",
      username: "demo_writer",
      displayName: "Soobyeong",
      passwordHash: "demo-password-not-for-production",
    },
  });

  const tags = await Promise.all(
    [
      {
        name: "Next.js",
        slug: "nextjs",
        description: "Posts about Next.js",
      },
      {
        name: "Prisma",
        slug: "prisma",
        description: "Posts about Prisma",
      },
      {
        name: "Docker",
        slug: "docker",
        description: "Posts about Docker",
      },
      {
        name: "Essay",
        slug: "essay",
        description: "Notes and essays",
      },
    ].map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: tag,
      }),
    ),
  );

  await prisma.post.upsert({
    where: { slug: "welcome-to-woori-blog" },
    update: {},
    create: {
      title: "Welcome to Woori Blog",
      slug: "welcome-to-woori-blog",
      content:
        "This is a starter post to verify your blog setup. You can create posts and test tag filtering from the main page.",
      status: "PUBLISHED",
      authorId: user.id,
      tags: {
        connect: tags.slice(0, 2).map((tag) => ({ id: tag.id })),
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
