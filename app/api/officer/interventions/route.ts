import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

interface InterventionItem {
  id: string;
  officer_id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_village?: string;
  intervention_type: string;
  notes?: string;
  outcome?: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

const DEFAULT_INTERVENTIONS: InterventionItem[] = [
  {
    id: 'INT-901',
    officer_id: 'usr_admin_demo_1',
    farmer_id: 'FRM-7821',
    farmer_name: 'Ramesh Chandra Mohapatra',
    farmer_village: 'Baripada Block, Mayurbhanj',
    intervention_type: 'Field Visit',
    notes: 'Urgent field inspection for 3.8 acres of Swarna Paddy experiencing severe dry spell (-22% rain deficit) and early stem borer infestation. Recommended immediate micro-irrigation scheduling.',
    outcome: 'Soil moisture sensor reading recorded at 24%. Connected farmer with Custom Hiring Center for solar pump support.',
    risk_level: 'HIGH',
    status: 'IN_PROGRESS',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'INT-902',
    officer_id: 'usr_admin_demo_1',
    farmer_id: 'FRM-6190',
    farmer_name: 'Basanti Murmu',
    farmer_village: 'Betnoti Block, Mayurbhanj',
    intervention_type: 'Emergency Advisory',
    notes: 'Groundnut crop affected by Tikka Disease vector and soil moisture depletion. Sent high-priority SMS advisory for foliar spray with Mancozeb.',
    outcome: 'Farmer confirmed receipt of advisory. Follow-up inspection scheduled.',
    risk_level: 'HIGH',
    status: 'SCHEDULED',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'INT-903',
    officer_id: 'usr_admin_demo_1',
    farmer_id: 'FRM-5034',
    farmer_name: 'Biren Kumar Sethi',
    farmer_village: 'Badasahi Block, Mayurbhanj',
    intervention_type: 'Field Visit',
    notes: 'Canal water stoppage reported during vegetative growth stage. Assisted farmer in filing for emergency lift irrigation quota.',
    outcome: 'Application submitted to Executive Engineer; temporary water tanker supplied.',
    risk_level: 'HIGH',
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 6 * 86400000).toISOString()
  },
  {
    id: 'INT-904',
    officer_id: 'usr_admin_demo_1',
    farmer_id: 'FRM-4112',
    farmer_name: 'Satyabhama Mahanta',
    farmer_village: 'Kuliana Block, Mayurbhanj',
    intervention_type: 'Phone Call',
    notes: 'Consultation on SHG micro-loan restructuring and mustard crop pest management.',
    outcome: 'Farmer advised on bio-pesticide neem oil formulation and repayment moratorium.',
    risk_level: 'MEDIUM',
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'INT-905',
    officer_id: 'usr_admin_demo_1',
    farmer_id: 'FRM-3980',
    farmer_name: 'Dibakar Hansdah',
    farmer_village: 'Rairangpur Block, Mayurbhanj',
    intervention_type: 'Field Visit',
    notes: 'Routine seasonal audit of HQPM-1 Maize crop. Verified healthy stand and optimal soil moisture.',
    outcome: 'No immediate risks detected. Recommended standard fertilizer application.',
    risk_level: 'LOW',
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: 'INT-906',
    officer_id: 'usr_admin_demo_1',
    farmer_id: 'FRM-7821',
    farmer_name: 'Ramesh Chandra Mohapatra',
    farmer_village: 'Baripada Block, Mayurbhanj',
    intervention_type: 'Emergency Advisory',
    notes: 'Broadcast warning for severe heatwave in Mayurbhanj interior blocks.',
    outcome: 'Farmer alerted to apply mulching to prevent rapid evaporation.',
    risk_level: 'HIGH',
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const farmerId = searchParams.get('farmerId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

    let items: InterventionItem[] = [];

    try {
      // 1. Try querying real RDS database
      const [rows]: any = await pool.query(`
        SELECT 
          id, officer_id, farmer_id, farmer_name, intervention_type, notes, outcome, risk_level, status, created_at
        FROM officer_interventions
        ORDER BY created_at DESC
      `);

      if (rows && rows.length > 0) {
        items = rows.map((r: any) => ({
          id: r.id,
          officer_id: r.officer_id,
          farmer_id: r.farmer_id,
          farmer_name: r.farmer_name || `Farmer (${r.farmer_id})`,
          farmer_village: 'Mayurbhanj District',
          intervention_type: r.intervention_type,
          notes: r.notes || '',
          outcome: r.outcome || '',
          risk_level: r.risk_level || 'MEDIUM',
          status: r.status || 'SCHEDULED',
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
        }));
      } else {
        // Seed default interventions into DB
        for (const item of DEFAULT_INTERVENTIONS) {
          await pool.query(`
            INSERT IGNORE INTO officer_interventions 
              (id, officer_id, farmer_id, farmer_name, intervention_type, notes, outcome, risk_level, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            item.id,
            item.officer_id,
            item.farmer_id,
            item.farmer_name,
            item.intervention_type,
            item.notes,
            item.outcome,
            item.risk_level,
            item.status,
            new Date(item.created_at)
          ]).catch(() => {});
        }
        items = [...DEFAULT_INTERVENTIONS];
      }
    } catch (dbErr: any) {
      console.warn('[Officer Interventions GET] Using fallback data:', dbErr?.message);
      items = [...DEFAULT_INTERVENTIONS];
    }

    // Apply filters
    const filtered = items.filter((item) => {
      if (startDate && new Date(item.created_at) < new Date(startDate)) return false;
      if (endDate && new Date(item.created_at) > new Date(endDate + 'T23:59:59.999Z')) return false;
      if (farmerId && item.farmer_id.toLowerCase() !== farmerId.toLowerCase()) return false;
      if (type && type !== 'ALL' && item.intervention_type.toLowerCase() !== type.toLowerCase()) return false;
      if (status && status !== 'ALL' && item.status.toUpperCase() !== status.toUpperCase()) return false;
      if (search) {
        const matchesFarmer = item.farmer_name.toLowerCase().includes(search) || item.farmer_id.toLowerCase().includes(search);
        const matchesNotes = item.notes?.toLowerCase().includes(search);
        const matchesType = item.intervention_type.toLowerCase().includes(search);
        if (!matchesFarmer && !matchesNotes && !matchesType) return false;
      }
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      },
      summary: {
        totalInterventions: total,
        highRiskInterventions: filtered.filter(i => i.risk_level === 'HIGH').length,
        completedCount: filtered.filter(i => i.status === 'COMPLETED').length,
        scheduledCount: filtered.filter(i => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS').length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'server_error', message: error.message || 'Failed to fetch interventions' } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { farmerId, farmerName, type, notes, outcome, riskLevel = 'MEDIUM', status = 'SCHEDULED' } = body;

    const newRecord: InterventionItem = {
      id: `INT-${Date.now().toString().slice(-6)}`,
      officer_id: 'usr_admin_demo_1',
      farmer_id: farmerId || 'FRM-7821',
      farmer_name: farmerName || 'Ramesh Chandra Mohapatra',
      farmer_village: 'Mayurbhanj District',
      intervention_type: type || 'Field Visit',
      notes: notes || 'Officer inspection recorded',
      outcome: outcome || '',
      risk_level: riskLevel,
      status: status,
      created_at: new Date().toISOString()
    };

    try {
      await pool.query(`
        INSERT INTO officer_interventions 
          (id, officer_id, farmer_id, farmer_name, intervention_type, notes, outcome, risk_level, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newRecord.id,
        newRecord.officer_id,
        newRecord.farmer_id,
        newRecord.farmer_name,
        newRecord.intervention_type,
        newRecord.notes,
        newRecord.outcome,
        newRecord.risk_level,
        newRecord.status,
        new Date(newRecord.created_at)
      ]);

      return NextResponse.json({
        success: true,
        message: 'Intervention logged successfully to AWS RDS',
        data: newRecord
      }, { status: 201 });
    } catch (dbErr: any) {
      console.error('[Officer Intervention POST Error]:', dbErr?.message || dbErr);
      return NextResponse.json(
        { error: { code: 'database_error', message: dbErr?.message || 'Failed to save intervention to database' } },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'bad_request', message: err.message || 'Failed to log intervention' } },
      { status: 400 }
    );
  }
}
