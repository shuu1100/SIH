import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { signJwt } from '@/lib/auth-jwt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      fullName,
      name,
      mobileNumber,
      phone,
      email,
      password,
      state = 'Odisha',
      district = 'Mayurbhanj',
      block = 'Baripada',
      village = 'Baripada',
      latitude,
      longitude,
      landArea = 3.5,
      soilType = 'Red Loamy',
      currentCrop = 'Rice / Paddy',
      sowingDate = new Date().toISOString().split('T')[0],
      preferredLanguage = 'English',
      language = 'en',
    } = body;

    const farmerName = (fullName || name || '').trim();
    const rawPhone = (mobileNumber || phone || '').trim().replace(/\D/g, '');
    const cleanPhone = rawPhone.slice(-10);
    const farmerEmail = email && email.trim().length > 0 ? email.trim().toLowerCase() : null;
    const farmerDistrict = (district || 'Mayurbhanj').trim();
    const farmerVillage = (village || block || 'Baripada').trim();
    const farmerState = (state || 'Odisha').trim();
    const farmerLang = preferredLanguage || language || 'en';
    const parsedArea = parseFloat(String(landArea)) || 3.50;
    const parsedLat = parseFloat(String(latitude)) || 21.9324;
    const parsedLon = parseFloat(String(longitude)) || 86.7351;

    // 1. Validation
    if (!farmerName || farmerName.length < 2) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'Full name is required (at least 2 characters).' } },
        { status: 400 }
      );
    }

    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'Valid 10-digit Indian mobile number is required.' } },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'Password must be at least 6 characters long.' } },
        { status: 400 }
      );
    }

    // 2. Connect to database
    const connection = await pool.getConnection();

    try {
      // Check duplicate phone in `farmers` or email in `users`
      const [existingFarmers]: any = await connection.query(
        'SELECT id FROM farmers WHERE phone = ? LIMIT 1;',
        [cleanPhone]
      );

      const [existingUsers]: any = await connection.query(
        'SELECT id FROM users WHERE (email = ? AND ? IS NOT NULL) LIMIT 1;',
        [farmerEmail, farmerEmail]
      );

      if ((existingFarmers && existingFarmers.length > 0) || (existingUsers && existingUsers.length > 0)) {
        return NextResponse.json(
          { error: { code: 'duplicate_phone', message: 'A farmer with this mobile number or email is already registered. Please log in.' } },
          { status: 409 }
        );
      }

      // 3. Hash Password securely with bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 4. Generate Unique Identifiers
      const timestamp = Date.now();
      const farmerId = `FRM_${timestamp.toString().slice(-8)}_${Math.floor(100 + Math.random() * 900)}`;
      const farmId = `FRM_LAND_${timestamp.toString().slice(-8)}`;
      const cropId = `CRP_${timestamp.toString().slice(-8)}`;
      const notifId = `NTF_${timestamp.toString().slice(-8)}`;

      // 5. Begin Transaction
      await connection.beginTransaction();

      // Insert into `farmers`
      await connection.query(
        `INSERT INTO farmers (id, name, phone, email, password_hash, district, village, language, land_area, state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          farmerId,
          farmerName,
          cleanPhone,
          farmerEmail,
          hashedPassword,
          farmerDistrict,
          farmerVillage,
          farmerLang,
          parsedArea,
          farmerState,
        ]
      );

      // Insert into `users` table for unified authentication
      try {
        await connection.query(
          `INSERT INTO users (id, email, name, role, profile_id)
           VALUES (?, ?, ?, 'farmer', ?);`,
          [
            farmerId,
            farmerEmail,
            farmerName,
            farmerId,
          ]
        );
      } catch (userErr) {
        console.warn('[users table insert note]:', userErr);
      }

      // Insert into `farmer_profiles`
      try {
        await connection.query(
          `INSERT INTO farmer_profiles (id, user_id, name, phone, district, village, state, language, land_area, soil_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            farmerId,
            farmerId,
            farmerName,
            cleanPhone,
            farmerDistrict,
            farmerVillage,
            farmerState,
            farmerLang,
            parsedArea,
            soilType,
          ]
        );
      } catch (profErr) {
        console.warn('[farmer_profiles insert note]:', profErr);
      }

      // Insert into `farms`
      await connection.query(
        `INSERT INTO farms (id, farmer_id, name, latitude, longitude, area, soil_type, village, district)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          farmId,
          farmerId,
          `${farmerName}'s Farm`,
          parsedLat,
          parsedLon,
          parsedArea,
          soilType,
          farmerVillage,
          farmerDistrict,
        ]
      );

      // Insert into `crops`
      const formattedSowingDate = sowingDate && /^\d{4}-\d{2}-\d{2}$/.test(sowingDate)
        ? sowingDate
        : new Date().toISOString().split('T')[0];

      await connection.query(
        `INSERT INTO crops (id, farmer_id, name, stage, sowing_date)
         VALUES (?, ?, ?, ?, ?);`,
        [
          cropId,
          farmerId,
          currentCrop || 'Rice / Paddy',
          'Vegetative',
          formattedSowingDate,
        ]
      );

      // Insert initial welcome notification
      try {
        await connection.query(
          `INSERT INTO notifications (id, user_id, farmer_id, type, priority, title, message, action_label, action_url)
           VALUES (?, ?, ?, 'welcome', 'info', 'Welcome to Smart Crop', 'Your farm profile has been successfully registered. You are all set to monitor crop health and receive early distress alerts.', 'View Farm Dashboard', '/dashboard');`,
          [
            notifId,
            farmerId,
            farmerId,
          ]
        );
      } catch (notifErr) {
        console.warn('[notifications insert note]:', notifErr);
      }

      // Commit transaction
      await connection.commit();

      // Generate signed JWT token
      const accessToken = signJwt({
        id: farmerId,
        name: farmerName,
        role: 'farmer',
        email: farmerEmail || undefined,
        mobileNumber: cleanPhone,
      }, 86400 * 7);

      const registeredFarmer = {
        id: farmerId,
        fullName: farmerName,
        name: farmerName,
        phone: cleanPhone,
        mobileNumber: cleanPhone,
        email: farmerEmail,
        role: 'farmer',
        accountStatus: 'active',
        district: farmerDistrict,
        village: farmerVillage,
        state: farmerState,
        landArea: parsedArea,
        currentCrop,
        metadata: {
          district: farmerDistrict,
          village: farmerVillage,
          state: farmerState,
          landArea: parsedArea,
          currentCrop,
          language: farmerLang
        }
      };

      const response = NextResponse.json(
        {
          success: true,
          message: 'Farmer registered successfully.',
          accessToken,
          userId: farmerId,
          farmerId,
          farmId,
          cropId,
          role: 'farmer',
          farmer: registeredFarmer,
          user: registeredFarmer,
        },
        { status: 201 }
      );

      // Set cookies for authentication session
      response.cookies.set('smartcrop_token', accessToken, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 86400 * 7,
        secure: process.env.NODE_ENV === 'production',
      });

      response.cookies.set('smartcrop_session', JSON.stringify(registeredFarmer), {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 86400 * 7,
        secure: process.env.NODE_ENV === 'production',
      });

      return response;

    } catch (dbErr: any) {
      await connection.rollback();
      console.error('[Farmer Registration DB Error]:', dbErr);
      return NextResponse.json(
        { error: { code: 'database_error', message: dbErr.message || 'Failed to save farmer to database.' } },
        { status: 500 }
      );
    } finally {
      connection.release();
    }

  } catch (err: any) {
    console.error('[Farmer Registration Route Error]:', err);
    return NextResponse.json(
      { error: { code: 'server_error', message: err.message || 'Internal server error during registration.' } },
      { status: 500 }
    );
  }
}
