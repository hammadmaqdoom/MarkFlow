import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-text">MarkFlow</h1>
          <p className="mt-1 text-sm text-text-muted">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
