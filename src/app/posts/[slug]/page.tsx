import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addCommentAction,
  deleteCommentAction,
  deletePostAction,
} from "@/app/actions";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { auth } from "@/lib/auth";
import { COMMENT_MAX_LENGTH, formatDate } from "@/lib/community";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PostDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type CommentWithReplies = {
  id: string;
  authorName: string;
  isAdmin: boolean;
  content: string;
  createdAt: Date;
  replies: Array<{
    id: string;
    authorName: string;
    isAdmin: boolean;
    content: string;
    createdAt: Date;
  }>;
};

// Shared renderer for top-level comments and replies.
function CommentCard({
  comment,
  slug,
  postId,
  isAdmin,
  isReply = false,
}: {
  comment: CommentWithReplies;
  slug: string;
  postId: string;
  isAdmin: boolean;
  isReply?: boolean;
}) {
  const isDeleted = comment.content === "[deleted]";
  const canDelete = isAdmin || !comment.isAdmin;

  return (
    <article
      className={
        isReply
          ? `comment-item comment-item--reply${isDeleted ? " comment-item--deleted" : ""}`
          : `comment-item${isDeleted ? " comment-item--deleted" : ""}`
      }
    >
      <div className="comment-item__head">
        <div className="comment-author">
          <strong>{isDeleted ? "Deleted" : comment.authorName}</strong>
          {!isDeleted && comment.isAdmin ? <span className="admin-badge">Admin</span> : null}
        </div>
        <div className="comment-head-actions">
          <span className="meta-text">{formatDate(comment.createdAt)}</span>
          {canDelete && !isDeleted ? (
            <form action={deleteCommentAction} className="comment-delete-inline">
              <input type="hidden" name="commentId" value={comment.id} />
              <input type="hidden" name="slug" value={slug} />
              {!isAdmin ? (
                <input
                  name="password"
                  type="password"
                  className="comment-input comment-input--mini"
                  placeholder="Password"
                  minLength={4}
                  maxLength={64}
                  required
                />
              ) : null}
              <button type="submit" className="comment-delete-button">
                Delete
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <p>{isDeleted ? "This comment has been deleted." : comment.content}</p>

      {!isDeleted ? (
        <div className="comment-manage">
          {!isReply ? (
            <form action={addCommentAction} className="comment-form comment-form--reply">
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="parentId" value={comment.id} />

              {!isAdmin ? (
                <div className="comment-form__row">
                  <input
                    name="authorName"
                    className="comment-input"
                    placeholder="Your name"
                    maxLength={30}
                    required
                  />
                  <input
                    name="password"
                    type="password"
                    className="comment-input"
                    placeholder="Reply password"
                    minLength={4}
                    maxLength={64}
                    required
                  />
                </div>
              ) : null}

              <textarea
                name="content"
                className="comment-textarea comment-textarea--small"
                placeholder="Write a reply"
                maxLength={COMMENT_MAX_LENGTH}
                required
              />

              <button type="submit" className="button-primary comment-submit">
                Add Reply
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="reply-list">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={{ ...reply, replies: [] }}
              slug={slug}
              postId={postId}
              isAdmin={isAdmin}
              isReply
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { slug } = await params;
  const session = await auth();
  const isAdmin = Boolean(session?.user?.isAdmin);

  const post = await prisma.post.findUnique({
    where: { slug: decodeURIComponent(slug) },
    include: {
      author: {
        select: { displayName: true },
      },
      tags: {
        orderBy: { name: "asc" },
      },
      comments: {
        where: {
          parentId: null,
        },
        orderBy: { createdAt: "asc" },
        include: {
          replies: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  // Hide tombstoned parent comments that no longer have visible replies.
  const visibleTopLevelComments = post.comments.filter(
    (comment) => !(comment.content === "[deleted]" && comment.replies.length === 0),
  );

  return (
    <main className="detail-page">
      <section className="detail-main-card">
        <div className="detail-head">
          <div className="detail-head__title">
            <div className="tag-row">
              {post.tags.map((tag) => (
                <Link key={tag.id} href={`/?tag=${encodeURIComponent(tag.slug)}`} className="pill">
                  #{tag.name}
                </Link>
              ))}
            </div>

            <div className="title-row">
              <h1>{post.title}</h1>
              {isAdmin ? (
                <div className="detail-toolbar">
                  <Link href={`/posts/${encodeURIComponent(post.slug)}/edit`} className="button-primary">
                    Edit Post
                  </Link>
                  <form action={deletePostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="slug" value={post.slug} />
                    <button type="submit" className="button-danger">
                      Delete Post
                    </button>
                  </form>
                </div>
              ) : null}
            </div>

            <div className="detail-meta">
              <span>Author {post.author.displayName}</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>

        <MarkdownRenderer content={post.content} className="detail-body markdown-body" />

        <div className="detail-bottom-bar">
          <Link href="/" className="text-link">
            Back to home
          </Link>
        </div>
      </section>

      <section className="comments-card">
        <div className="comments-card__header">
          <div>
            <p className="eyebrow">Comments</p>
            <h2>Leave a comment</h2>
          </div>
          <span className="meta-text">{visibleTopLevelComments.length} top-level comments</span>
        </div>

        <form action={addCommentAction} className="comment-form comment-form--create">
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="slug" value={post.slug} />

          {!isAdmin ? (
            <div className="comment-form__row">
              <input
                name="authorName"
                className="comment-input"
                placeholder="Your name"
                maxLength={30}
                required
              />
              <input
                name="password"
                type="password"
                className="comment-input"
                placeholder="Comment password"
                minLength={4}
                maxLength={64}
                required
              />
            </div>
          ) : (
            <div className="comment-admin-note">Commenting as Soobyeong</div>
          )}

          <textarea
            name="content"
            className="comment-textarea"
            placeholder={`Write a comment (max ${COMMENT_MAX_LENGTH} chars)`}
            maxLength={COMMENT_MAX_LENGTH}
            required
          />

          <button type="submit" className="button-primary comment-submit">
            Add Comment
          </button>
        </form>

        <div className="comment-list">
          {visibleTopLevelComments.length === 0 ? (
            <p>No comments yet.</p>
          ) : (
            visibleTopLevelComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                slug={post.slug}
                postId={post.id}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>
      </section>
    </main>
  );
}
