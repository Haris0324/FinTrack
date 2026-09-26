import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import fs from 'fs';
import path from 'path';

const MODEL_DIR = path.join(process.cwd(), '..', 'xgboost_engine', 'xgboost_model');
const META_PATH  = path.join(MODEL_DIR, 'model_metadata.json');

function readMeta() {
  try {
    if (!fs.existsSync(META_PATH)) return null;
    return JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const meta = readMeta();
  const dirModel = path.join(MODEL_DIR, 'xgboost_direction_model.json');
  const impModel = path.join(MODEL_DIR, 'xgboost_impact_model.json');
  const regModel = path.join(MODEL_DIR, 'xgboost_regression_model.json');

  return NextResponse.json({
    metadata: meta,
    isLoaded: !!meta,
    models: {
      direction: { exists: fs.existsSync(dirModel), name: 'xgboost_direction_model.json' },
      impact:    { exists: fs.existsSync(impModel),  name: 'xgboost_impact_model.json' },
      regression:{ exists: fs.existsSync(regModel),  name: 'xgboost_regression_model.json' },
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { direction_threshold, high_impact_threshold } = body;

  // Validate ranges
  if (direction_threshold !== undefined) {
    const v = Number(direction_threshold);
    if (isNaN(v) || v < 0.1 || v > 0.9) {
      return NextResponse.json({ error: 'direction_threshold must be between 0.1 and 0.9' }, { status: 400 });
    }
  }
  if (high_impact_threshold !== undefined) {
    const v = Number(high_impact_threshold);
    if (isNaN(v) || v < 0.5 || v > 5.0) {
      return NextResponse.json({ error: 'high_impact_threshold must be between 0.5 and 5.0' }, { status: 400 });
    }
  }

  const meta = readMeta();
  if (!meta) return NextResponse.json({ error: 'Model metadata not found' }, { status: 404 });

  if (direction_threshold !== undefined) meta.direction_threshold = Number(direction_threshold);
  if (high_impact_threshold !== undefined) meta.high_impact_threshold = Number(high_impact_threshold);

  try {
    fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
    return NextResponse.json({ success: true, metadata: meta });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to write metadata', detail: e.message }, { status: 500 });
  }
}
