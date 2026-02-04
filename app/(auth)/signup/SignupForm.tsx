// SIGNUP DISABLED - Uncomment when ready to enable signups
// "use client";
//
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";
// import { useState } from "react";
//
// export function SignupForm() {
//   const supabase = createClient();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [message, setMessage] = useState<string | null>(null);
//
//   async function signUpWithGitHub() {
//     setLoading(true);
//     setError(null);
//     const { error: err } = await supabase.auth.signInWithOAuth({
//       provider: "github",
//       options: { redirectTo: `${window.location.origin}/callback?next=/w` },
//     });
//     if (err) {
//       setError(err.message);
//       setLoading(false);
//       return;
//     }
//   }
//
//   async function signUpWithEmail(e: React.FormEvent) {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//     setMessage(null);
//     const { error: err } = await supabase.auth.signUp({ email, password });
//     if (err) {
//       setError(err.message);
//       setLoading(false);
//       return;
//     }
//     setMessage("Check your email for the confirmation link.");
//     setLoading(false);
//   }
//
//   return (
//     <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
//       {error && (
//         <p className="mb-4 text-sm text-red-600" role="alert">
//           {error}
//         </p>
//       )}
//       {message && (
//         <p className="mb-4 text-sm text-green-600" role="status">
//           {message}
//         </p>
//       )}
//       <button
//         type="button"
//         onClick={signUpWithGitHub}
//         disabled={loading}
//         className="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-bg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50"
//       >
//         {loading ? "Signing up…" : "Sign up with GitHub"}
//       </button>
//       <div className="my-4 flex items-center gap-2">
//         <div className="flex-1 border-t border-border" />
//         <span className="text-xs text-text-muted">or</span>
//         <div className="flex-1 border-t border-border" />
//       </div>
//       <form onSubmit={signUpWithEmail} className="space-y-4">
//         <div>
//           <label htmlFor="email" className="block text-sm font-medium text-text">
//             Email
//           </label>
//           <input
//             id="email"
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//             className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
//           />
//         </div>
//         <div>
//           <label htmlFor="password" className="block text-sm font-medium text-text">
//             Password
//           </label>
//           <input
//             id="password"
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//             minLength={6}
//             className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
//           />
//         </div>
//         <button
//           type="submit"
//           disabled={loading}
//           className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50"
//         >
//           Sign up with email
//         </button>
//       </form>
//       <p className="mt-4 text-center text-sm text-text-muted">
//         Already have an account?{" "}
//         <Link href="/login" className="text-accent hover:underline">
//           Sign in
//         </Link>
//       </p>
//     </div>
//   );
// }

export function SignupForm() {
  return null; // Signup disabled
}
