"use client";

import { useState } from "react";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type PostEditorFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaultTags: string;
  defaultTitle?: string;
  defaultContent?: string;
  postId?: string;
  originalSlug?: string;
};

export function PostEditorForm({
  action,
  submitLabel,
  defaultTags,
  defaultTitle = "",
  defaultContent = "",
  postId,
  originalSlug,
}: PostEditorFormProps) {
  const [content, setContent] = useState(defaultContent);

  return (
    <form action={action} className="editor-form">
      {postId ? <input type="hidden" name="postId" value={postId} /> : null}
      {originalSlug ? <input type="hidden" name="originalSlug" value={originalSlug} /> : null}

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="Next.js, Prisma, Notes"
          defaultValue={defaultTags}
          maxLength={300}
        />
        <span className="field-hint">Separate multiple tags with commas.</span>
      </div>

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="Enter a title"
          defaultValue={defaultTitle}
          maxLength={160}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="content">Content</label>
        <span className="field-hint">Markdown supported. Use external image URLs if you want to embed images.</span>

        <textarea
          id="content"
          name="content"
          className="editor-write-area"
          placeholder="Write your post here"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={20000}
          required
        />

        <div className="editor-preview-wrap">
          <p className="editor-preview-label">Preview</p>
          <MarkdownRenderer
            content={content || "_Write something to preview your Markdown._"}
            className="editor-preview markdown-body"
          />
        </div>
      </div>

      <div className="submit-row">
        <span className="field-hint">You will move directly to the detail page after saving.</span>
        <button type="submit" className="button-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
