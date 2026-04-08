import Link from "next/link";
import { notFound } from "next/navigation";
import { updatePostAction } from "@/app/actions";
import { PostEditorForm } from "@/components/post-editor-form";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EditPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditPostPage({ params }: EditPostPageProps) {
  await requireAdminSession();
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug: decodeURIComponent(slug) },
    include: {
      tags: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!post) {
    notFound();
  }

  return (
    <main className="editor-shell">
      <div className="editor-layout editor-layout--single">
        <section className="editor-card">
          <p className="eyebrow">Edit Post</p>
          <h1>Edit Post</h1>

          <PostEditorForm
            action={updatePostAction}
            submitLabel="Save Changes"
            defaultTags={post.tags.map((tag) => tag.name).join(", ")}
            defaultTitle={post.title}
            defaultContent={post.content}
            postId={post.id}
            originalSlug={post.slug}
          />
        </section>

        <aside className="detail-aside markdown-guide-box">
          <p className="eyebrow">Markdown Quick Guide</p>
          <ul className="list markdown-guide markdown-guide--compact">
            <li>
              <strong>Heading</strong> <code># Title</code>
            </li>
            <li>
              <strong>Emphasis</strong> <code>**bold**</code> <code>*italic*</code>
            </li>
            <li>
              <strong>Link</strong> <code>[text](https://example.com)</code>
            </li>
            <li>
              <strong>List</strong> <code>- item</code> <code>1. item</code>
            </li>
            <li>
              <strong>Quote</strong> <code>{"> quote"}</code>
            </li>
            <li>
              <strong>Code</strong> <code>`inline`</code> <code>{'```js ... ```'}</code>
            </li>
            <li>
              <strong>Image</strong> <code>![alt](https://image-url)</code>
            </li>
            <li>
              <strong>Image Size</strong> <code>![alt](https://image-url "w=640 h=360")</code>
            </li>
          </ul>
          <p className="meta-text">To embed an image, paste an external image URL in Markdown.</p>
          <p>
            <Link href="/">Back to home</Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
