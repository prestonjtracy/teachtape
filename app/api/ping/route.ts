export const dynamic = 'force-dynamic'; 
export async function GET() {
  return new Response("pong", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
