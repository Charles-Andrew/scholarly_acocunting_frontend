import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  // Create response and explicitly clear all Supabase cookies
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = NextResponse.redirect(new URL('/login', appUrl), {
    status: 302,
  });

  // Clear all Supabase session cookies
  const cookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'sb-provider-token',
  ];

  cookieNames.forEach((name) => {
    response.cookies.delete(name);
  });

  return response;
}
