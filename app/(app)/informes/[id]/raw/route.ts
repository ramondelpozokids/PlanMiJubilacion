import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/supabase/server';
import { getBillingDocumentForUser } from '@/lib/billing/issue';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
  }

  const doc = await getBillingDocumentForUser(profile.id, params.id);
  if (!doc?.html_snapshot) {
    return new NextResponse('Documento no encontrado', { status: 404 });
  }

  return new NextResponse(doc.html_snapshot, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${doc.doc_number}.html"`,
    },
  });
}
