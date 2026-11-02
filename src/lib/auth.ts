import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDatabase } from "@/db";
import { authSchema } from "@/db/schema";
import { emailDeliveryConfigured, googleSignInConfigured, sendTransactionalEmail } from "@/lib/email";
import { assertSafeEmailLink } from "@/lib/links";
import { ensureProfile, deleteHealthData } from "@/lib/services/workspace";

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  return "dev-only-healthtrack-secret-not-for-production";
}

const databasePromise = getDatabase();

export const auth = betterAuth({
  secret: authSecret(),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000").origin],
  database: drizzleAdapter(
    (await databasePromise).db,
    { provider: "sqlite", schema: authSchema, camelCase: true },
  ),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: emailDeliveryConfigured(),
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      assertSafeEmailLink(url, process.env.BETTER_AUTH_URL || "http://localhost:3000");
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your HealthTrack password",
        text: `Use this link to reset your password. It expires in one hour.\n\n${url}\n\nIf you did not ask for this, you can ignore it.`,
      });
    },
  },
  emailVerification: emailDeliveryConfigured()
    ? {
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url }) => {
          assertSafeEmailLink(url, process.env.BETTER_AUTH_URL || "http://localhost:3000");
          await sendTransactionalEmail({
            to: user.email,
            subject: "Verify your HealthTrack email",
            text: `Confirm this email address for HealthTrack:\n\n${url}`,
          });
        },
      }
    : undefined,
  socialProviders: googleSignInConfigured()
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
      }
    : undefined,
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const { client } = await getDatabase();
        await deleteHealthData(client, user.id);
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const { client } = await getDatabase();
          await ensureProfile(client, user.id, user.name);
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    window: 60,
    max: 30,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()],
});
