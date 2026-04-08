"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type LoginFormProps = {
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");

    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl,
    });

    setPending(false);

    if (!result || result.error) {
      setError("Login failed. Check your admin email and password.");
      return;
    }

    window.location.href = result.url ?? callbackUrl;
  }

  return (
    <form action={onSubmit} className="editor-form">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="admin@example.com"
          autoComplete="username"
          maxLength={254}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          minLength={8}
          maxLength={128}
          required
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="submit-row">
        <span className="field-hint">Only the admin account can write posts.</span>
        <button type="submit" className="button-primary" disabled={pending}>
          {pending ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </form>
  );
}
