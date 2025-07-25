import FamLocatorClient from '@/components/fam-locator-client';

export default async function Home() {
  // The server component's only job is to render the client component.
  // All authentication and data loading logic is now handled on the client
  // to prevent the server-side redirect loop.
  return <FamLocatorClient />;
}
