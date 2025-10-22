import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const DATA_API = process.env.POLYMARKET_DATA_API_URL || 'https://data-api.polymarket.com';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const single = sp.get('user') || '';
    const usersParam = sp.get('users') || '';
    const market = sp.get('market') || undefined;

    const users = [single, usersParam]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    if (!users.length) {
      return NextResponse.json({ success: false, error: 'Missing user(s)' }, { status: 400 });
    }

    const results = await Promise.all(
      users.map(async (u) => {
        try {
          const { data } = await axios.get(`${DATA_API}/value`, {
            params: market ? { user: u, market } : { user: u },
            timeout: 15000,
          });
          // API responds with an array [{ user, value }]
          const first = Array.isArray(data) && data.length ? data[0] : null;
          return { user: u, value: first?.value ?? null };
        } catch (e) {
          return { user: u, value: null };
        }
      })
    );

    return NextResponse.json({ success: true, data: results, count: results.length });
  } catch (error: any) {
    console.error('value route error', error?.message || error);
    return NextResponse.json({ success: false, error: 'Failed to fetch value' }, { status: 500 });
  }
}


