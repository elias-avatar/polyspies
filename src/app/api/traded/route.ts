import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const DATA_API = process.env.POLYMARKET_DATA_API_URL || 'https://data-api.polymarket.com';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const user = sp.get('user');
    if (!user) {
      return NextResponse.json({ success: false, error: 'Missing user' }, { status: 400 });
    }

    const { data } = await axios.get(`${DATA_API}/traded`, {
      params: { user },
      timeout: 15000,
    });

    // API returns { user, traded }
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('traded route error', error?.message || error);
    return NextResponse.json({ success: false, error: 'Failed to fetch traded' }, { status: 500 });
  }
}


