import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <Stack screenOptions={{ title: 'Hue Controller' }} />
    </QueryClientProvider>
  );
}
