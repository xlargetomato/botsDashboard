'use client';

import { Suspense } from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

// The main ResetPassword page component that wraps the ResetPasswordForm in a Suspense boundary
export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
