import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const POST_TITLE_MAX_LENGTH = 160;
export const POST_CONTENT_MAX_LENGTH = 20_000;
export const TAG_INPUT_MAX_LENGTH = 300;
export const COMMENT_AUTHOR_MAX_LENGTH = 30;
export const COMMENT_PASSWORD_MIN_LENGTH = 4;
export const COMMENT_PASSWORD_MAX_LENGTH = 64;

const COMMENT_PASSWORD_PREFIX = "s2";

function safeEqualText(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function isSameCredential(input: string, expected: string) {
  return safeEqualText(input, expected);
}

export function normalizeSingleLine(value: string) {
  return value.replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").trim();
}

export function hashCommentPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${COMMENT_PASSWORD_PREFIX}:${salt}:${hash}`;
}

function verifyScryptCommentPassword(input: string, storedHash: string) {
  const [, salt, storedDigest] = storedHash.split(":");

  if (!salt || !storedDigest) {
    return false;
  }

  const derived = scryptSync(input, salt, 64).toString("hex");
  return safeEqualText(derived, storedDigest);
}

function verifyLegacySha256CommentPassword(input: string, storedHash: string) {
  const inputHash = createHash("sha256").update(input).digest("hex");
  return safeEqualText(inputHash, storedHash);
}

export function isCommentPasswordValid(input: string, storedHash: string) {
  if (storedHash.startsWith(`${COMMENT_PASSWORD_PREFIX}:`)) {
    return verifyScryptCommentPassword(input, storedHash);
  }

  // Backward compatibility for older rows stored as plain sha256 hex digest.
  return verifyLegacySha256CommentPassword(input, storedHash);
}
