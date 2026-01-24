import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  // Create response and explicitly clear all Supabase cookies
  const response = NextResponse.redirect(new URL('/login', 'http://localhost:3000'), {
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
