import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App';

const CLERK_PUBLISHABLE_KEY =
  (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || '';
const CONVEX_URL = (import.meta as any).env?.VITE_CONVEX_URL || '';

const hasValidClerkKey =
  Boolean(CLERK_PUBLISHABLE_KEY) &&
  !CLERK_PUBLISHABLE_KEY.includes('your_clerk_publishable_key');

const hasValidConvexUrl =
  Boolean(CONVEX_URL) && !CONVEX_URL.includes('your-project-name');

const convexClient = hasValidConvexUrl
  ? new ConvexReactClient(CONVEX_URL)
  : null;

function renderWithProviders() {
  const app = (
    <App hasClerk={hasValidClerkKey} hasConvex={Boolean(convexClient)} />
  );
  const withConvex = convexClient ? (
    <ConvexProvider client={convexClient}>{app}</ConvexProvider>
  ) : (
    app
  );

  if (hasValidClerkKey) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        {withConvex}
      </ClerkProvider>
    );
  }
  return withConvex;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{renderWithProviders()}</React.StrictMode>
);
