import { QueryClient } from '@tanstack/react-query';

export function createLoopinQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
      },
    },
  });
}

export const loopinQueryClient = createLoopinQueryClient();
