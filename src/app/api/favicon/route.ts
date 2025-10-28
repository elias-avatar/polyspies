import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Use the workspace root path to read the source logo
    const root = process.cwd();
    // The provided image lives one directory up from the app (workspace root)
    const filePath = path.resolve(root, '..', 'polyspies.png');
    const buf = await fs.readFile(filePath);
    return new NextResponse(buf, { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch (e) {
    return NextResponse.json({ error: 'favicon not found' }, { status: 404 });
  }
}


