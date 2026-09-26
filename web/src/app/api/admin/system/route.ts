import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { requireAdmin } from '@/lib/adminAuth';
import fs from 'fs';
import path from 'path';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintrack';

function readModelMetadata() {
  try {
    const p = path.join(process.cwd(), '..', 'xgboost_engine', 'xgboost_model', 'model_metadata.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('fintrack');
    const newsCol = db.collection('news');

    const now = new Date();
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const h1  = new Date(now.getTime() - 60 * 60 * 1000);
    const h48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalArticles,
      articlesToday,
      articlesLast1h,
      highImpactToday,
      articlesUnprocessed,
      articlesOlderThan48h,
      sentimentBreakdown,
      pipelineStats,
      totalUsers,
      newUsersToday,
      recentLogs,
      requestVolume24h,
    ] = await Promise.all([
      newsCol.countDocuments({}),
      newsCol.countDocuments({ scraped_at: { $gte: h24 } }),
      newsCol.countDocuments({ scraped_at: { $gte: h1 } }),
      newsCol.countDocuments({ scraped_at: { $gte: h24 }, impact: 'HIGH IMPACT' }),
      newsCol.countDocuments({ $or: [{ sentiment: null }, { sentiment: { $exists: false } }] }),
      newsCol.countDocuments({ published_at: { $lt: h48 } }),
      newsCol.aggregate([
        { $match: { scraped_at: { $gte: h24 } } },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]).toArray(),
      db.collection('pipelinestats').findOne({ _id: 'cumulative_stats' as any }),
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      ActivityLog.find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('userId', 'name email')
        .lean(),
      newsCol.aggregate([
        { $match: { scraped_at: { $gte: h24 } } },
        {
          $group: {
            _id: { $hour: '$scraped_at' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id': 1 } },
      ]).toArray(),
    ]);

    const sentimentMap: Record<string, number> = {};
    sentimentBreakdown.forEach((s: any) => { sentimentMap[s._id || 'UNKNOWN'] = s.count; });

    const volumeMap: Record<number, number> = {};
    requestVolume24h.forEach((v: any) => { volumeMap[v._id] = v.count; });
    const volumeFormatted = Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      requests: volumeMap[i] || 0,
    }));

    return NextResponse.json({
      totalArticles,
      articlesToday,
      articlesLast1h,
      highImpactToday,
      articlesUnprocessed,
      articlesOlderThan48h,
      sentimentBreakdown: sentimentMap,
      pipelineStats,
      totalUsers,
      newUsersToday,
      recentLogs,
      requestVolume24h: volumeFormatted,
      modelMetadata: readModelMetadata(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch system stats', detail: e.message }, { status: 500 });
  } finally {
    await client.close();
  }
}
