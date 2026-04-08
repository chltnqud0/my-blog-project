import { BlogIndexClient } from "@/components/blog-index-client";
import { ensureBlogBootstrap, formatDate } from "@/lib/community";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{
    tag?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  await ensureBlogBootstrap();
  const resolvedSearchParams = await searchParams;
  const activeTags = Array.isArray(resolvedSearchParams?.tag)
    ? resolvedSearchParams.tag.map((tag) => tag.trim()).filter(Boolean)
    : resolvedSearchParams?.tag
      ? [resolvedSearchParams.tag.trim()].filter(Boolean)
      : [];

  const [tags, posts] = await Promise.all([
    prisma.tag.findMany({
      where: {
        posts: {
          some: {
            status: "PUBLISHED",
          },
        },
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        ...(activeTags.length > 0
          ? {
              AND: activeTags.map((tag) => ({
                tags: {
                  some: {
                    slug: tag,
                  },
                },
              })),
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { displayName: true },
        },
        tags: {
          orderBy: { name: "asc" },
        },
      },
    }),
  ]);

  // Exclude fully-deleted/tombstoned top-level comments from list counts.
  const visibleCommentCounts = posts.length
    ? await prisma.comment.groupBy({
        by: ["postId"],
        where: {
          postId: {
            in: posts.map((post) => post.id),
          },
          NOT: {
            AND: [
              { content: "[deleted]" },
              {
                replies: {
                  none: {},
                },
              },
            ],
          },
        },
        _count: {
          _all: true,
        },
      })
    : [];

  const commentCountByPostId = new Map(
    visibleCommentCounts.map((row) => [row.postId, row._count._all]),
  );

  return (
    <main className="page-shell page-shell--compact">
      <BlogIndexClient
        activeTags={activeTags}
        tags={tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          postCount: tag._count.posts,
        }))}
        posts={posts.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          createdAtLabel: formatDate(post.createdAt),
          authorName: post.author.displayName,
          commentCount: commentCountByPostId.get(post.id) ?? 0,
          tags: post.tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
          })),
        }))}
      />
    </main>
  );
}
