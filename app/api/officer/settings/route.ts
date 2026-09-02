import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { extractBearerToken, verifyJwt } from '@/lib/auth-jwt';

// Helper to resolve current officer user
async function getOfficerUser(req: NextRequest) {
  let userId = 'usr_admin_demo_1';
  let userEmail = 'admin@agri.gov.in';
  let userName = 'Dr. Anil Verma';

  const token = extractBearerToken(req) || req.cookies.get('smartcrop_token')?.value;
  if (token) {
    const verified = verifyJwt(token);
    if (verified.valid && verified.payload) {
      userId = verified.payload.id || userId;
      userEmail = verified.payload.email || userEmail;
      userName = verified.payload.name || userName;
    }
  } else {
    const sessionCookie = req.cookies.get('smartcrop_session')?.value;
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie));
        if (parsed?.id) userId = parsed.id;
        if (parsed?.name) userName = parsed.name;
        if (parsed?.email) userEmail = parsed.email;
      } catch {}
    }
  }

  return { userId, userEmail, userName };
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getOfficerUser(req);

    const userRecord = {
      id: userId,
      name: 'Dr. Anil Verma',
      designation: 'Sub-Divisional Agricultural Officer (SDAO)',
      phone: '+91 98765 43211',
      email: 'admin@agri.gov.in',
      district: 'Mayurbhanj',
      subdivision: 'Baripada Subdivision',
      state: 'Odisha',
      jurisdiction: 'Mayurbhanj District (Baripada, Betnoti, Badasahi, Kuliana Blocks)'
    };

    let settings = {
      notify_high_distress: true,
      notify_weather_emergency: true,
      notify_new_assignment: true,
      notify_loan_insurance: false,
      preferred_language: 'en'
    };

    try {
      // 1. Fetch user from RDS
      const [userRows]: any = await pool.query('SELECT id, name, email, role FROM users WHERE id = ? OR role = ? LIMIT 1', [userId, 'administrator']);
      if (userRows && userRows.length > 0) {
        userRecord.id = userRows[0].id;
        userRecord.name = userRows[0].name || userRecord.name;
        userRecord.email = userRows[0].email || userRecord.email;
      }

      // 2. Fetch or create officer settings row in RDS
      const [settingsRows]: any = await pool.query('SELECT * FROM officer_settings WHERE user_id = ? LIMIT 1', [userRecord.id]);
      if (settingsRows && settingsRows.length > 0) {
        settings = {
          notify_high_distress: Boolean(settingsRows[0].notify_high_distress),
          notify_weather_emergency: Boolean(settingsRows[0].notify_weather_emergency),
          notify_new_assignment: Boolean(settingsRows[0].notify_new_assignment),
          notify_loan_insurance: Boolean(settingsRows[0].notify_loan_insurance),
          preferred_language: settingsRows[0].preferred_language || 'en'
        };
      } else {
        // Insert default settings
        await pool.query(
          `INSERT INTO officer_settings (user_id, notify_high_distress, notify_weather_emergency, notify_new_assignment, notify_loan_insurance, preferred_language)
           VALUES (?, true, true, true, false, 'en')`,
          [userRecord.id]
        ).catch(() => {});
      }
    } catch (dbErr: any) {
      console.warn('[Officer Settings GET] Database query notice:', dbErr?.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: userRecord,
        notifications: settings,
        language: settings.preferred_language
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'server_error', message: error.message || 'Failed to load officer settings' } },
      { status: 500 }
    );
  }
}
