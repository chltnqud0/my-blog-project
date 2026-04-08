"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, requireAdminUser } from "@/lib/auth";
import {
  COMMENT_MAX_LENGTH,
  createUniquePostSlug,
  parseTagNames,
  slugify,
} from "@/lib/community";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  COMMENT_AUTHOR_MAX_LENGTH,
  COMMENT_PASSWORD_MAX_LENGTH,
  COMMENT_PASSWORD_MIN_LENGTH,
  POST_CONTENT_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  TAG_INPUT_MAX_LENGTH,
  hashCommentPassword,
  isCommentPasswordValid,
  normalizeSingleLine,
} from "@/lib/security";

// Build normalized tag records from comma-separated input.
function buildTagRecords(tagInput: string) {
  return parseTagNames(tagInput).map((tagName, index) => {
    const normalizedSlug = slugify(tagName) || `tag-${Date.now()}-${index + 1}`;

    return {
      name: tagName,
      slug: normalizedSlug,
    };
  });
}

function buildCreateTagWrite(tagInput: string) {
  const tagRecords = buildTagRecords(tagInput);

  return {
    connectOrCreate: tagRecords.map((tag) => ({
      where: { slug: tag.slug },
      create: tag,
    })),
  };
}

function buildUpdateTagWrite(tagInput: string) {
  const tagRecords = buildTagRecords(tagInput);

  return {
    set: [],
    connectOrCreate: tagRecords.map((tag) => ({
      where: { slug: tag.slug },
      create: tag,
    })),
  };
}

async function isAdminSession() {
  const session = await auth();
  return Boolean(session?.user?.isAdmin);
}

async function getClientFingerprint() {
  // Used for coarse in-memory rate limiting by source IP/UA.
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = h.get("x-real-ip")?.trim();
  const userAgent = h.get("user-agent")?.trim() ?? "unknown";
  return `${forwardedFor || realIp || "unknown"}:${userAgent.slice(0, 120)}`;
}

export async function createPostAction(formData: FormData) {
  // Server-side validation is authoritative (client validation can be bypassed).
  const title = normalizeSingleLine(String(formData.get("title") ?? ""));
  const content = String(formData.get("content") ?? "").trim();
  const tagInput = String(formData.get("tags") ?? "").trim();

  if (!title || !content) {
    throw new Error("Title and content are required.");
  }

  if (title.length > POST_TITLE_MAX_LENGTH) {
    throw new Error(`Title must be ${POST_TITLE_MAX_LENGTH} characters or fewer.`);
  }

  if (content.length > POST_CONTENT_MAX_LENGTH) {
    throw new Error(`Content must be ${POST_CONTENT_MAX_LENGTH} characters or fewer.`);
  }

  if (tagInput.length > TAG_INPUT_MAX_LENGTH) {
    throw new Error(`Tags must be ${TAG_INPUT_MAX_LENGTH} characters or fewer.`);
  }

  const [author, slug] = await Promise.all([requireAdminUser(), createUniquePostSlug(title)]);

  const post = await prisma.post.create({
    data: {
      title,
      content,
      slug,
      authorId: author.id,
      status: "PUBLISHED",
      tags: buildCreateTagWrite(tagInput),
    },
  });

  revalidatePath("/");
  revalidatePath(`/posts/${post.slug}`);
  redirect(`/posts/${encodeURIComponent(post.slug)}`);
}

export async function updatePostAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();
  const originalSlug = String(formData.get("originalSlug") ?? "").trim();
  const title = normalizeSingleLine(String(formData.get("title") ?? ""));
  const content = String(formData.get("content") ?? "").trim();
  const tagInput = String(formData.get("tags") ?? "").trim();

  if (!postId || !originalSlug || !title || !content) {
    throw new Error("Missing required post fields.");
  }

  if (title.length > POST_TITLE_MAX_LENGTH) {
    throw new Error(`Title must be ${POST_TITLE_MAX_LENGTH} characters or fewer.`);
  }

  if (content.length > POST_CONTENT_MAX_LENGTH) {
    throw new Error(`Content must be ${POST_CONTENT_MAX_LENGTH} characters or fewer.`);
  }

  if (tagInput.length > TAG_INPUT_MAX_LENGTH) {
    throw new Error(`Tags must be ${TAG_INPUT_MAX_LENGTH} characters or fewer.`);
  }

  await requireAdminUser();

  const nextSlug = await createUniquePostSlug(title, postId);

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      title,
      content,
      slug: nextSlug,
      tags: buildUpdateTagWrite(tagInput),
    },
  });

  revalidatePath("/");
  revalidatePath(`/posts/${originalSlug}`);
  revalidatePath(`/posts/${post.slug}`);
  revalidatePath(`/posts/${originalSlug}/edit`);
  redirect(`/posts/${encodeURIComponent(post.slug)}`);
}

export async function deletePostAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!postId) {
    throw new Error("Missing post id.");
  }

  await requireAdminUser();

  await prisma.post.delete({
    where: { id: postId },
  });

  revalidatePath("/");

  if (slug) {
    revalidatePath(`/posts/${slug}`);
  }

  redirect("/");
}

export async function addCommentAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim();
  const authorName = normalizeSingleLine(String(formData.get("authorName") ?? ""));
  const password = String(formData.get("password") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const admin = await isAdminSession();
  const fingerprint = await getClientFingerprint();

  enforceRateLimit(`comment:create:${fingerprint}`, 20, 10 * 60 * 1000);

  if (!postId || !slug || !content) {
    throw new Error("Missing comment fields.");
  }

  if (content.length > COMMENT_MAX_LENGTH) {
    throw new Error(`Comment must be ${COMMENT_MAX_LENGTH} characters or fewer.`);
  }

  if (!admin && (!authorName || !password)) {
    throw new Error("Name and password are required.");
  }

  if (!admin && authorName.length > COMMENT_AUTHOR_MAX_LENGTH) {
    throw new Error(`Name must be ${COMMENT_AUTHOR_MAX_LENGTH} characters or fewer.`);
  }

  if (
    !admin &&
    (password.length < COMMENT_PASSWORD_MIN_LENGTH || password.length > COMMENT_PASSWORD_MAX_LENGTH)
  ) {
    throw new Error(
      `Password must be ${COMMENT_PASSWORD_MIN_LENGTH}-${COMMENT_PASSWORD_MAX_LENGTH} characters.`,
    );
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, slug: true },
  });

  if (!post || post.slug !== decodeURIComponent(slug)) {
    throw new Error("Invalid post reference.");
  }

  if (parentId) {
    // Only allow one-level replies.
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, postId: true, parentId: true },
    });

    if (!parent || parent.postId !== postId || parent.parentId !== null) {
      throw new Error("Invalid parent comment.");
    }
  }

  await prisma.comment.create({
    data: {
      authorName: admin ? "Soobyeong" : authorName,
      passwordHash: admin ? null : hashCommentPassword(password),
      isAdmin: admin,
      content,
      postId,
      parentId: parentId || null,
    },
  });

  revalidatePath(`/posts/${slug}`);
  redirect(`/posts/${encodeURIComponent(slug)}`);
}

export async function deleteCommentAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const admin = await isAdminSession();
  const fingerprint = await getClientFingerprint();

  enforceRateLimit(`comment:delete:${fingerprint}`, 20, 10 * 60 * 1000);

  if (!commentId || !slug) {
    throw new Error("Comment deletion requires comment info.");
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      parentId: true,
      passwordHash: true,
      isAdmin: true,
      post: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (comment.post.slug !== decodeURIComponent(slug)) {
    throw new Error("Invalid comment target.");
  }

  if (!admin) {
    if (!comment.passwordHash || !password || !isCommentPasswordValid(password, comment.passwordHash)) {
      throw new Error("Invalid comment password.");
    }
  }

  const isParentComment = comment.parentId === null;

  if (isParentComment) {
    const replyCount = await prisma.comment.count({
      where: { parentId: commentId },
    });

    if (replyCount > 0) {
      // Keep parent row tombstoned so replies can stay visible in thread history.
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          authorName: "Deleted",
          content: "[deleted]",
          passwordHash: null,
          isAdmin: false,
        },
      });
    } else {
      await prisma.comment.delete({
        where: { id: commentId },
      });
    }
  } else {
    const parentId = comment.parentId;

    if (!parentId) {
      throw new Error("Invalid reply parent.");
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    // If the parent had been soft-deleted and now has no replies, remove it too.
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        content: true,
      },
    });

    if (parent && parent.content === "[deleted]") {
      const remainingReplies = await prisma.comment.count({
        where: { parentId: parent.id },
      });

      if (remainingReplies === 0) {
        await prisma.comment.delete({
          where: { id: parent.id },
        });
      }
    }
  }

  revalidatePath(`/posts/${slug}`);
  redirect(`/posts/${encodeURIComponent(slug)}`);
}
