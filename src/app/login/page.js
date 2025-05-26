'use client';

import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>}>
      <LoginForm />
    </Suspense>
  );
}
