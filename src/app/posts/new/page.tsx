import Link from "next/link";
import { createPostAction } from "@/app/actions";
import { PostEditorForm } from "@/components/post-editor-form";
import { requireAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  await requireAdminSession();

  return (
    <main className="editor-shell">
      <div className="editor-layout editor-layout--single">
        <section className="editor-card">
          <p className="eyebrow">Write Post</p>
          <h1>New Post</h1>

          <PostEditorForm action={createPostAction} submitLabel="Publish Post" defaultTags="" />
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
