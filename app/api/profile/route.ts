import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth-jwt';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'farmer' | 'admin' | 'administrator' | 'bank';
  profile_id?: string;
  district?: string;
  village?: string;
  phone?: string;
  language?: string;
  land_area?: number;
  loan_amount?: number;
  bank_name?: string;
  designation?: string;
  created_at?: string;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');

    // IDOR Protection: Standard users can only view their own profile; admins/banks can view any
    let targetUserId = authResult.user.id;
    if (requestedUserId && requestedUserId !== authResult.user.id) {
      const isPrivileged = ['administrator', 'admin', 'bank'].includes(authResult.user.role);
      if (!isPrivileged) {
        return NextResponse.json(
          { error: { code: 'forbidden', message: 'You do not have permission to view other user profiles.' } },
          { status: 403 }
        );
      }
      targetUserId = requestedUserId;
    }

    try {
      const rows = await query<any[]>(
        `SELECT u.id, u.email, u.name, u.role, u.profile_id, u.created_at,
                f.phone, f.district, f.village, f.language, f.land_area, f.loan_amount, f.loan_due_date
         FROM users u
         LEFT JOIN farmers f ON (u.profile_id = f.id OR u.id = f.id)
         WHERE u.id = ? OR u.profile_id = ?
         LIMIT 1`,
        [targetUserId, targetUserId]
      );

      if (rows && rows.length > 0) {
        return NextResponse.json({ success: true, data: rows[0], source: 'aws_rds' });
      }
    } catch (dbErr) {
      console.warn('[API /api/profile] RDS query fallback:', dbErr);
    }

    // Return token user info if DB query doesn't match
    return NextResponse.json({
      success: true,
      data: {
        id: authResult.user.id,
        name: authResult.user.name,
        role: authResult.user.role,
        email: authResult.user.email || '',
        phone: authResult.user.mobileNumber || ''
      },
      source: 'jwt_session'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const body = await req.json().catch(() => ({}));
    const {
      name,
      email,
      phone,
      district,
      village,
      language = 'en',
      land_area = 0,
      bank_name,
      designation
    } = body;

    // Strict security: User can only update their own profile; cannot self-escalate role
    const id = authResult.user.id;
    const role = authResult.user.role;
    const profileId = id;

    const profileData: UserProfile = {
      id,
      email: email || authResult.user.email || '',
      name: name || authResult.user.name || 'User',
      role,
      profile_id: profileId,
      phone: phone || authResult.user.mobileNumber || '',
      district: district ? String(district).slice(0, 100) : '',
      village: village ? String(village).slice(0, 100) : '',
      language: language ? String(language).slice(0, 10) : 'en',
      land_area: Math.max(0, Number(land_area) || 0),
      bank_name: bank_name ? String(bank_name).slice(0, 100) : undefined,
      designation: designation ? String(designation).slice(0, 100) : undefined,
      created_at: new Date().toISOString()
    };

    try {
      // 1. Update user
      await query(`
        UPDATE users 
        SET email = COALESCE(?, email),
            name = COALESCE(?, name)
        WHERE id = ?
      `, [profileData.email, profileData.name, id]);

      // 2. If farmer, update farmers table
      if (role === 'farmer') {
        await query(`
          INSERT INTO farmers (id, name, phone, district, village, language, land_area)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            phone = VALUES(phone),
            district = VALUES(district),
            village = VALUES(village),
            language = VALUES(language),
            land_area = VALUES(land_area)
        `, [id, profileData.name, profileData.phone, profileData.district, profileData.village, profileData.language, profileData.land_area]);
      }

      return NextResponse.json({ success: true, data: profileData, source: 'aws_rds' }, { status: 200 });
    } catch (dbErr: any) {
      console.error('[API POST /api/profile] RDS save error:', dbErr?.message || dbErr);
      return NextResponse.json(
        { success: false, error: dbErr?.message || 'Failed to persist profile to AWS RDS database.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
