'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function LogoutButton(): React.ReactElement {
  const router = useRouter();

  async function onClick(): Promise<void> {
    try {
      await api.logout();
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      Log out
    </Button>
  );
}
