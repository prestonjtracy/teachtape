import { NextRequest } from "next/server";
import { z } from "zod";
import { sendEmailSMTP, sendEmailResend } from "@/lib/email";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  provider: z.enum(["smtp", "resend"]).default("smtp")
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, subject, html, provider } = schema.parse(body);
  if (provider === "smtp") {
    await sendEmailSMTP(to, subject, html);
  } else {
    await sendEmailResend(to, subject, html);
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
