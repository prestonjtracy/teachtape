import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Verification event
  if (body.event === "endpoint.url_validation") {
    const token = body.payload?.plainToken;
    // Zoom expects back the same token signed, but for basic validation we echo it
    return new Response(JSON.stringify({ plainToken: token, encryptedToken: token }), { status: 200 });
  }

  // Validate shared secret if you're using one
  const verificationToken = process.env.ZOOM_VERIFICATION_TOKEN;
  const headerToken = req.headers.get("authorization");
  if (verificationToken && headerToken !== `Bearer ${verificationToken}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // TODO: handle meeting events to update booking status, send reminders, etc.
  // Examples: meeting.created, meeting.ended

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
