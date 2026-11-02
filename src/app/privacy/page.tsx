import Link from "next/link";

export default function PublicPrivacyPage() {
  return (
    <main className="min-h-full bg-paper px-5 py-10">
      <article className="mx-auto max-w-2xl space-y-4 text-sm leading-6 text-ink-soft">
        <p className="display text-3xl text-ink">Privacy notice</p>
        <p>
          HealthTrack stores an account, the profile answers you enter, consent choices, and health measurements uploaded by a paired companion app. Creating an account is consent to store that information for this product.
        </p>
        <p>
          Passwords are hashed by the authentication provider. This website does not read Apple Health and does not claim a device is connected unless the server has an active device credential.
        </p>
        <p>
          You can delete stored health data while keeping the account, or delete the account from Profile. Deleting the account removes the login and the related profile, devices, and measurements.
        </p>
        <p>
          Email verification and password reset are sent only when email delivery is configured. Google sign-in appears only when Google credentials are configured.
        </p>
        <Link href="/" className="text-pine underline">Back</Link>
      </article>
    </main>
  );
}
