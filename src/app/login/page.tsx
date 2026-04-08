import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const callbackUrl = resolvedSearchParams?.callbackUrl || "/";

  if (session?.user?.isAdmin) {
    redirect(callbackUrl);
  }

  return (
    <main className="editor-shell">
      <div className="editor-layout">
        <section className="editor-card">
          <p className="eyebrow">Admin Login</p>
          <h1>Sign In</h1>
          <p>Only the admin account can create, edit, or delete posts.</p>
          <LoginForm callbackUrl={callbackUrl} />
        </section>
      </div>
    </main>
  );
}
