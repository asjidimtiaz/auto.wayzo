'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ── DEV ONLY — set to false before deploying ──────────────────────────────────
const DEV_BYPASS_AUTH = false;
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // ── DEV bypass ─────────────────────────────────────────────────────────
    if (DEV_BYPASS_AUTH) {
      console.log('DEBUG: Redirecting to admin...');
      window.location.href = '/admin';
      return;
    }
    // ───────────────────────────────────────────────────────────────────────
    // Middleware handles the redirect based on role
  }, [router]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );
}
