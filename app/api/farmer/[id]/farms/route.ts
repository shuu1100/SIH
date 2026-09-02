import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmerId } = await params;
    if (!farmerId) return NextResponse.json({ error: "Farmer ID required" }, { status: 400 });

    const farms = await query<any[]>(
      `SELECT id, farmer_id as farmerId, name, latitude, longitude, area, soil_type as soilType, village, district 
       FROM farms 
       WHERE farmer_id = ?
       ORDER BY id ASC;`,
      [farmerId]
    );

    return NextResponse.json(farms);
  } catch (error: any) {
    console.error("Error fetching farms:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmerId } = await params;
    if (!farmerId) return NextResponse.json({ error: "Farmer ID required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const { name, latitude = 21.9324, longitude = 86.7351, area = 1.0, soilType = "Red Loamy", village = "Baripada", district = "Mayurbhanj" } = body;

    const farmId = `FARM_${Date.now().toString().slice(-6)}_${Math.floor(100 + Math.random() * 900)}`;
    const parsedLat = parseFloat(String(latitude)) || 21.9324;
    const parsedLon = parseFloat(String(longitude)) || 86.7351;
    const parsedArea = parseFloat(String(area)) || 1.0;

    await query(
      `INSERT INTO farms (id, farmer_id, name, latitude, longitude, area, soil_type, village, district)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [farmId, farmerId, name || 'Farm Plot', parsedLat, parsedLon, parsedArea, soilType, village, district]
    );

    const newFarm = {
      id: farmId,
      farmerId,
      name: name || 'Farm Plot',
      latitude: parsedLat,
      longitude: parsedLon,
      area: parsedArea,
      soilType,
      village,
      district
    };

    return NextResponse.json(newFarm, { status: 201 });
  } catch (error: any) {
    console.error("Error creating farm:", error);
    return NextResponse.json({ error: error?.message || "Failed to create farm in database" }, { status: 500 });
  }
}
