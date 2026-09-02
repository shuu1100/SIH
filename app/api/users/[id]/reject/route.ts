import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Enforce Administrator-only access
  const authResult = requireAuth(req, ['administrator', 'admin']);
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { error: { code: 'bad_request', message: 'User ID parameter is required.' } },
      { status: 400 }
    );
  }

  try {
    const { pool } = await import('@/lib/db');
    await pool.query(`UPDATE bank_users SET status = 'suspended' WHERE id = ?`, [id]);
  } catch (err: any) {
    console.warn('[User Reject DB Note]:', err?.message);
  }

  return NextResponse.json({
    userId: id,
    status: "rejected",
    rejectedBy: authResult.user.name,
    message: `User account ${id} rejected by administrator.`
  }, { status: 200 });
}
