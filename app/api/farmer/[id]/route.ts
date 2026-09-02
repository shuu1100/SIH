import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Farmer ID is required' }, { status: 400 });
  }

  try {
    // Direct Query against AWS RDS MySQL with 10s connection timeout
    const rows = await query<any[]>(
      `SELECT id, name, phone, email, district, village, language, land_area, loan_amount, loan_due_date, state 
       FROM farmers 
       WHERE id = ? OR phone = ? 
       LIMIT 1;`,
      [id, id],
      10000
    );

    if (rows && rows.length > 0) {
      const f = rows[0];
      const farms = await query<any[]>(
        `SELECT id, name, area, soil_type, village, district, latitude, longitude 
         FROM farms 
         WHERE farmer_id = ?;`,
        [f.id],
        10000
      ).catch(() => []);

      const crops = await query<any[]>(
        `SELECT id, name, stage, sowing_date, area_acres 
         FROM crops 
         WHERE farmer_id = ?;`,
        [f.id],
        10000
      ).catch(() => []);

      return NextResponse.json({
        id: f.id,
        name: f.name,
        phone: f.phone,
        email: f.email,
        district: f.district || 'Mayurbhanj',
        village: f.village || 'Baripada',
        language: f.language || 'or',
        landArea: f.land_area ? parseFloat(f.land_area) : 3.5,
        state: f.state || 'Odisha',
        loans: f.loan_amount ? [{ loanAmount: f.loan_amount, dueDate: f.loan_due_date || '2026-09-30' }] : [],
        farms: farms.map((farm: any) => ({
          id: farm.id,
          name: farm.name,
          area: farm.area ? `${farm.area} acres` : '1.5 acres',
          village: farm.village || f.village || 'Baripada',
          district: farm.district || f.district || 'Mayurbhanj',
          location: `${farm.village || f.village || 'Baripada'}, ${farm.district || f.district || 'Mayurbhanj'}`,
          crop: crops.length > 0 ? crops[0].name : 'Rice / Paddy'
        })),
        crops: crops
      });
    }

    // If ID is demo ID 'FARMER-001' or 'usr_farmer_demo_1', return demo schema
    if (id === 'FARMER-001' || id === 'usr_farmer_demo_1') {
      return NextResponse.json({
        id: "usr_farmer_demo_1",
        name: "Ramesh Kumar Patel",
        phone: "9876543210",
        email: "farmer@smartcrop.in",
        village: "Baripada Rural",
        district: "Mayurbhanj",
        state: "Odisha",
        language: "or",
        landArea: 3.5,
        loans: [],
        farms: [
          {
            id: "FARM-DEMO-01",
            name: "North Basin Plot",
            area: "2.0 acres",
            village: "Baripada",
            district: "Mayurbhanj",
            location: "Baripada, Mayurbhanj",
            crop: "Paddy (Swarna MTU-7029)"
          }
        ],
        crops: [
          {
            id: "CRP-DEMO-01",
            name: "Paddy (Swarna MTU-7029)",
            stage: "Vegetative Stage",
            sowingDate: "2026-07-12"
          }
        ]
      });
    }

    return NextResponse.json(
      { error: "Farmer not found in AWS RDS MySQL database." },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('[API /api/farmer/[id] Error]:', err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch farmer from database." },
      { status: 500 }
    );
  }
}
