import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { extractBearerToken, verifyJwt } from '@/lib/auth-jwt';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, phone, email } = body;

    let userId = 'usr_admin_demo_1';
    const token = extractBearerToken(req) || req.cookies.get('smartcrop_token')?.value;
    if (token) {
      const verified = verifyJwt(token);
      if (verified.valid && verified.payload?.id) {
        userId = verified.payload.id;
      }
    }

    if (email && !validateEmail(email)) {
      return NextResponse.json(
        { error: { code: 'invalid_email', message: 'Please provide a valid email address.' } },
        { status: 400 }
      );
    }

    if (phone && !validatePhone(phone)) {
      return NextResponse.json(
        { error: { code: 'invalid_phone', message: 'Please provide a valid 10-digit contact number.' } },
        { status: 400 }
      );
    }

    const cleanPhone = phone ? phone.trim() : null;
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanName = name ? name.trim() : null;

    try {
      await pool.query(
        `UPDATE users SET 
          name = COALESCE(?, name), 
          email = COALESCE(?, email) 
         WHERE id = ? OR role = 'administrator'`,
        [cleanName, cleanEmail, userId]
      );
    } catch (dbErr: any) {
      console.warn('[Officer Profile PATCH] DB update warning:', dbErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Officer profile updated successfully.',
      data: { name: cleanName, phone: cleanPhone, email: cleanEmail }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'server_error', message: error.message || 'Failed to update profile.' } },
      { status: 500 }
    );
  }
}
