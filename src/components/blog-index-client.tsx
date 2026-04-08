import Link from "next/link";

type TagSummary = {
  id: string;
  name: string;
  slug: string;
  postCount: number;
};

type PostSummary = {
  id: string;
  title: string;
  slug: string;
  content: string;
  createdAtLabel: string;
  authorName: string;
  commentCount: number;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type BlogIndexClientProps = {
  activeTags: string[];
  tags: TagSummary[];
  posts: PostSummary[];
};

function buildTagHref(activeTags: string[], nextTag: string) {
  const params = new URLSearchParams();
  const tagSet = new Set(activeTags);

  if (tagSet.has(nextTag)) {
    tagSet.delete(nextTag);
  } else {
    tagSet.add(nextTag);
  }

  for (const tag of tagSet) {
    params.append("tag", tag);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function BlogIndexClient({ activeTags, tags, posts }: BlogIndexClientProps) {
  return (
    <section className="blog-index">
      <div className="section-heading section-heading--stack">
        <div>
          <p className="eyebrow">Posts</p>
          <h1 className="page-title">
            {activeTags.length > 0 ? activeTags.map((tag) => `#${tag}`).join(" ") : "All Posts"}
          </h1>
        </div>
      </div>

      <div className="tag-filter-bar">
        <Link href="/" className={activeTags.length === 0 ? "tag-filter active-tag-filter" : "tag-filter"}>
          All
        </Link>
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={buildTagHref(activeTags, tag.slug)}
            className={activeTags.includes(tag.slug) ? "tag-filter active-tag-filter" : "tag-filter"}
          >
            #{tag.name} ({tag.postCount})
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <article className="panel empty-state">
          <h3>No posts for this tag</h3>
          <p>Choose another tag or write a new post.</p>
        </article>
      ) : (
        <div className="post-list">
          {posts.map((post) => (
            <Link key={post.id} href={`/posts/${encodeURIComponent(post.slug)}`} className="post-card">
              <div className="post-card__top">
                <div className="tag-row">
                  {post.tags.map((tag) => (
                    <span key={tag.id} className="pill">
                      #{tag.name}
                    </span>
                  ))}
                </div>
                <span className="meta-text">{post.createdAtLabel}</span>
              </div>
              <h3>{post.title}</h3>
              <p>{post.content.length > 180 ? `${post.content.slice(0, 180)}...` : post.content}</p>
              <div className="post-card__meta">
                <span>Author {post.authorName}</span>
                <span>Comments {post.commentCount}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
