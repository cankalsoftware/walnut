/**
 * Clerk + Convex Authentication Configuration
 * Supports BOTH:
 * 1. Clerk Development (`https://trusting-sunbird-7334.clerk.accounts.dev`)
 * 2. Clerk Production (`https://clerk.pinarlik.com` for walnut.pinarlik.com)
 * so both local Expo/Web dev and live production authenticate seamlessly!
 */
declare const process: { env: Record<string, string | undefined> };

export default {
  providers: [
    {
      domain:
        process.env.CLERK_JWT_ISSUER_DOMAIN ||
        'https://trusting-sunbird-7334.clerk.accounts.dev',
      applicationID: 'convex',
    },
    {
      domain: 'https://clerk.pinarlik.com',
      applicationID: 'convex',
    },
  ],
};
