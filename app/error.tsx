'use client';

import { useEffect } from 'react';

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error('[RIS Error Boundary] message:', error?.message);
    console.error('[RIS Error Boundary] stack:', error?.stack);
    console.error('[RIS Error Boundary] cause:', error?.cause);
  }, [error]);

  return (
    <main style={{ padding: 32 }}>
      시스템 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
    </main>
  );
}
