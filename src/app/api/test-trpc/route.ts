export async function GET() {
  return Response.json({ message: 'Test tRPC route is working', timestamp: new Date().toISOString() })
}

export async function POST() {
  return Response.json({ message: 'POST is working', timestamp: new Date().toISOString() })
}