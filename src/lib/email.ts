export function emailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function googleSignInConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!emailDeliveryConfigured()) {
    throw new Error("Email delivery is not configured");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok) {
    throw new Error("Email delivery failed");
  }
}
