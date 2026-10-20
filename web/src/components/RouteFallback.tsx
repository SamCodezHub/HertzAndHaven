import { Skeleton } from '@heroui/react';

/** Route-level fallback used while a lazy page chunk resolves. */
export default function RouteFallback() {
  return (
    <div className="min-h-screen bg-canvas p-6">
      <Skeleton className="h-12 w-full max-w-md rounded-xl" />
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="mt-4 h-80 w-full rounded-2xl" />
    </div>
  );
}
