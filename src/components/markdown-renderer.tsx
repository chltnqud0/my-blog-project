"use client";

import type { ImgHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

function parseImageSize(title?: string | null) {
  if (!title) {
    return {};
  }

  const widthMatch = title.match(/(?:^|\s)w=(\d{1,4})(?:\s|$)/i);
  const heightMatch = title.match(/(?:^|\s)h=(\d{1,4})(?:\s|$)/i);

  const width = widthMatch ? Number(widthMatch[1]) : undefined;
  const height = heightMatch ? Number(heightMatch[1]) : undefined;

  return {
    width: width && width > 0 ? width : undefined,
    height: height && height > 0 ? height : undefined,
  };
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a({ href, children, ...props }) {
            const linkHref = href ?? "";
            const isExternal = /^https?:\/\//i.test(linkHref);

            return (
              <a
                href={linkHref}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer nofollow" : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
          img({ title, ...props }) {
            // Optional markdown title metadata: ![alt](/img.png "w=640 h=360")
            const { width, height } = parseImageSize(title);

            return (
              // Allow optional size metadata via markdown title: "w=640 h=360"
              <img
                {...(props as ImgHTMLAttributes<HTMLImageElement>)}
                width={width}
                height={height}
                alt={props.alt ?? ""}
                loading="lazy"
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
