import Link from "next/link";
import { requireAdminSession } from "@/lib/auth";
import { formatDate } from "@/lib/community";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CommentsPage() {
  await requireAdminSession();

  const comments = await prisma.comment.findMany({
    where: {
      NOT: {
        content: "[deleted]",
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        select: {
          title: true,
          slug: true,
        },
      },
      parent: {
        select: {
          id: true,
          authorName: true,
        },
      },
    },
  });

  return (
    <main className="page-shell page-shell--compact">
      <section className="comments-admin">
        <div className="section-heading section-heading--stack">
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="page-title">Recent Comments</h1>
          </div>
          <span className="meta-text">{comments.length} total</span>
        </div>

        {comments.length === 0 ? (
          <article className="panel empty-state">
            <h3>No comments yet</h3>
            <p>Comments from all posts will appear here in newest-first order.</p>
          </article>
        ) : (
          <div className="comment-feed">
            {comments.map((comment) => (
              <article key={comment.id} className="comment-feed-item">
                <div className="comment-feed-head">
                  <div className="comment-author">
                    <strong>{comment.authorName}</strong>
                    {comment.isAdmin ? <span className="admin-badge">Admin</span> : null}
                    {comment.parentId ? <span className="reply-badge">Reply</span> : null}
                  </div>
                  <span className="meta-text">{formatDate(comment.createdAt)}</span>
                </div>

                <p>{comment.content}</p>

                <div className="comment-feed-meta">
                  <span>Post: {comment.post.title}</span>
                  {comment.parent ? <span>Parent: {comment.parent.authorName}</span> : <span>Top-level</span>}
                  <Link href={`/posts/${encodeURIComponent(comment.post.slug)}`} className="text-link">
                    Open Post
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
