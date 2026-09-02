import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { signJwt } from '@/lib/auth-jwt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      username, 
      password, 
      fullName, 
      name,
      email, 
      mobileNumber, 
      phone,
      role = 'farmer',
      state = 'Odisha',
      district = 'Mayurbhanj',
      village = 'Baripada',
      landArea = 3.5,
      soilType = 'Red Loamy',
      currentCrop = 'Rice / Paddy',
      sowingDate = new Date().toISOString().split('T')[0],
      preferredLanguage = 'English',
      language = 'en',
      metadata = {}
    } = body;

    const finalPhone = (mobileNumber || phone || '').replace(/\D/g, '').slice(-10);
    const finalEmail = email ? email.trim().toLowerCase() : null;
    const finalName = (fullName || name || username || 'Smart Crop User').trim();
    const finalUsername = (username || finalPhone || (finalEmail ? finalEmail.split('@')[0] : '')).trim();
    const parsedArea = parseFloat(String(landArea)) || 3.50;

    if ((!finalPhone && !finalEmail && !finalUsername) || !password) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "Mobile number/email and password are required." } },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "Password must be at least 8 characters long for security." } },
        { status: 400 }
      );
    }

    // Role validation
    const validRoles = ['farmer', 'administrator', 'bank'];
    const normalizedRole = role === 'admin' ? 'administrator' : role;
    if (!validRoles.includes(normalizedRole)) {
      return NextResponse.json(
        { error: { code: "invalid_role", message: "Invalid role specified." } },
        { status: 400 }
      );
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const timestamp = Date.now();
    const prefix = normalizedRole === 'farmer' ? 'FRM' : normalizedRole === 'bank' ? 'BNK' : 'ADM';
    const userId = `${prefix}_${timestamp.toString().slice(-8)}_${Math.floor(100 + Math.random() * 900)}`;
    const cropId = `CRP_${timestamp.toString().slice(-8)}`;

    const connection = await pool.getConnection();

    try {
      // 1. Check duplicate user in `users`
      const [existingUsers]: any = await connection.query(
        'SELECT id FROM users WHERE (phone = ? AND ? != "") OR (email = ? AND ? IS NOT NULL) OR (username = ? AND ? != "") LIMIT 1;',
        [finalPhone, finalPhone, finalEmail, finalEmail, finalUsername, finalUsername]
      );

      if (existingUsers && existingUsers.length > 0) {
        return NextResponse.json(
          { error: { code: "duplicate_user", message: "An account with this mobile number, email, or username already exists." } },
          { status: 409 }
        );
      }

      await connection.beginTransaction();

      // 2. Insert into `users` table
      await connection.query(
        `INSERT INTO users (id, email, name, role, profile_id)
         VALUES (?, ?, ?, ?, ?);`,
        [
          userId,
          finalEmail,
          finalName,
          normalizedRole,
          userId,
        ]
      );

      // 3. If farmer, insert into `farmers`, `farms`, `crops`
      if (normalizedRole === 'farmer') {
        const farmId = `FRM_LAND_${timestamp.toString().slice(-8)}`;

        await connection.query(
          `INSERT INTO farmers (id, name, phone, email, password_hash, district, village, language, land_area, state)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            userId,
            finalName,
            finalPhone || `943${timestamp.toString().slice(-7)}`,
            finalEmail,
            hashedPassword,
            district || 'Mayurbhanj',
            village || 'Baripada',
            preferredLanguage || language || 'or',
            parsedArea,
            state || 'Odisha',
          ]
        );

        await connection.query(
          `INSERT INTO farms (id, farmer_id, name, latitude, longitude, area, soil_type, village, district)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            farmId,
            userId,
            `${finalName}'s Farm`,
            21.9324,
            86.7351,
            parsedArea,
            soilType || 'Red Loamy',
            village || 'Baripada',
            district || 'Mayurbhanj',
          ]
        );

        await connection.query(
          `INSERT INTO crops (id, farmer_id, name, stage, sowing_date)
           VALUES (?, ?, ?, ?, ?);`,
          [
            cropId,
            userId,
            currentCrop || 'Rice / Paddy',
            'Vegetative',
            sowingDate && /^\d{4}-\d{2}-\d{2}$/.test(sowingDate) ? sowingDate : new Date().toISOString().split('T')[0],
          ]
        );
      }

      await connection.commit();

      // 4. Issue signed JWT token
      const accessToken = signJwt({
        id: userId,
        name: finalName,
        role: normalizedRole as any,
        email: finalEmail || undefined,
        mobileNumber: finalPhone || undefined,
      });

      const registeredUser = {
        id: userId,
        fullName: finalName,
        email: finalEmail,
        mobileNumber: finalPhone,
        role: normalizedRole,
        district,
        village,
        state,
        landArea: parsedArea,
        currentCrop
      };

      const response = NextResponse.json({
        success: true,
        message: "User registered successfully.",
        accessToken,
        userId,
        farmerId: userId,
        role: normalizedRole,
        user: registeredUser
      }, { status: 201 });

      response.cookies.set('smartcrop_token', accessToken, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 86400 * 7,
        secure: process.env.NODE_ENV === 'production',
      });

      response.cookies.set('smartcrop_session', JSON.stringify(registeredUser), {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 86400 * 7,
        secure: process.env.NODE_ENV === 'production',
      });

      return response;

    } catch (dbErr: any) {
      await connection.rollback();
      console.error('[User Registration DB Error]:', dbErr);
      return NextResponse.json(
        { error: { code: "database_error", message: dbErr.message || "Failed to save user to database." } },
        { status: 500 }
      );
    } finally {
      connection.release();
    }

  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "registration_error", message: err.message || "Registration failed." } },
      { status: 500 }
    );
  }
}
