import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import SessionLog from '@/models/SessionLog';

// ---------------------------------------------------------------------------
// Helper: try to ping an HTTP service and return { online, latencyMs }
// ---------------------------------------------------------------------------
async function pingService(
  url: string,
  timeoutMs = 5000
): Promise<{ online: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    return { online: res.ok, latencyMs: Date.now() - start };
  } catch {
    return { online: false, latencyMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/monitoring
// ---------------------------------------------------------------------------
export async function GET(_req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  await connectToDatabase();

  const now = new Date();
  const since24h   = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since48h   = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // ── Service endpoints ─────────────────────────────────────────────────────
  const pipelineUrl      = process.env.PIPELINE_URL ?? '';
  const nlpUrl           = process.env.NLP_URL ?? 'http://localhost:8000/health';
  const xgboostModelPath = process.env.XGBOOST_MODEL_PATH ?? '';

  const [pipelineHealth, nlpHealth] = await Promise.all([
    pipelineUrl
      ? pingService(pipelineUrl)
      : Promise.resolve({ online: false, latencyMs: 0 }),
    pingService(nlpUrl, 3000),
  ]);

  let pipelineDomain = pipelineUrl ? (() => {
    try { return new URL(pipelineUrl).hostname; } catch { return pipelineUrl; }
  })() : 'Not configured';

  const xgboostLoaded = Boolean(xgboostModelPath);

  // ── Core DB aggregations ──────────────────────────────────────────────────
  const [
    totalUsers,
    adminCount,
    newUsersToday,
    failedLogins24h,
    activeSessionCount,
    recentLogs,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ createdAt: { $gte: todayStart } }),
    ActivityLog.countDocuments({
      action: 'Failed login attempt',
      type: 'warning',
      createdAt: { $gte: since24h },
    }),
    SessionLog.countDocuments({ createdAt: { $gte: since24h } }),
    ActivityLog.find({ type: { $in: ['warning', 'danger'] } })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({ path: 'userId', select: 'name email', model: User })
      .lean(),
  ]);

  // ── Article / pipeline metrics (dynamic) ──────────────────────────────────
  let unprocessedArticles    = 0;
  let articlesOlderThan48h   = 0;
  let totalNewsToday         = 0;
  let pipelineStats = {
    totalScraped:           0,
    totalNlpAnalyzed:       0,
    totalEntitiesExtracted: 0,
    lastUpdated:            null as string | null,
  };

  // ── Sentiment breakdown (last 24 h) ───────────────────────────────────────
  let sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mongoose = require('mongoose');
    const modelCandidates = ['CryptoNews', 'NewsArticle', 'News', 'Article'];
    let NewsModel: any = null;
    for (const mn of modelCandidates) {
      if (mongoose.modelNames().includes(mn)) { NewsModel = mongoose.model(mn); break; }
    }

    if (NewsModel) {
      const [unproc, old48, today, agg, sentAgg] = await Promise.all([
        NewsModel.countDocuments({ analyzed: { $ne: true } }),
        NewsModel.countDocuments({ createdAt: { $lt: since48h }, analyzed: { $ne: true } }),
        NewsModel.countDocuments({ createdAt: { $gte: todayStart } }),
        NewsModel.aggregate([
          {
            $group: {
              _id:         null,
              total:       { $sum: 1 },
              analyzed:    { $sum: { $cond: ['$analyzed', 1, 0] } },
              entities:    { $sum: { $ifNull: ['$entityCount', 0] } },
              lastUpdated: { $max: '$updatedAt' },
            },
          },
        ]),
        NewsModel.aggregate([
          { $match: { createdAt: { $gte: since24h }, sentiment: { $exists: true, $ne: null } } },
          { $group: { _id: { $toLower: '$sentiment' }, count: { $sum: 1 } } },
        ]),
      ]);

      unprocessedArticles  = unproc;
      articlesOlderThan48h = old48;
      totalNewsToday       = today;

      if (agg[0]) {
        pipelineStats = {
          totalScraped:           agg[0].total,
          totalNlpAnalyzed:       agg[0].analyzed,
          totalEntitiesExtracted: agg[0].entities,
          lastUpdated: agg[0].lastUpdated
            ? new Date(agg[0].lastUpdated).toISOString()
            : null,
        };
      }

      sentAgg.forEach((s: { _id: string; count: number }) => {
        const lbl = s._id ?? '';
        if (lbl === 'positive' || lbl === 'bullish') sentimentBreakdown.positive += s.count;
        else if (lbl === 'negative' || lbl === 'bearish') sentimentBreakdown.negative += s.count;
        else sentimentBreakdown.neutral += s.count;
      });
    }
  } catch {
    // model not registered — totals remain 0
  }

  // ── Shape logs ────────────────────────────────────────────────────────────
  interface ShapedLog {
    _id:       string;
    level:     'ERROR' | 'WARNING';
    user:      string;
    action:    string;
    ip:        string;
    createdAt: string;
  }

  const errorLogs:   ShapedLog[] = [];
  const warningLogs: ShapedLog[] = [];

  (recentLogs as any[]).forEach((log) => {
    const shaped: ShapedLog = {
      _id:       log._id.toString(),
      level:     log.type === 'danger' ? 'ERROR' : 'WARNING',
      user:      (log.userId as any)?.name ?? 'System',
      action:    log.action ?? '',
      ip:        log.ip ?? '—',
      createdAt: log.createdAt
        ? new Date(log.createdAt).toISOString()
        : now.toISOString(),
    };
    if (shaped.level === 'ERROR') errorLogs.push(shaped);
    else                          warningLogs.push(shaped);
  });

  // ── Response ──────────────────────────────────────────────────────────────
  return NextResponse.json({
    services: {
      pipeline: {
        online:    pipelineHealth.online,
        latencyMs: pipelineHealth.latencyMs,
        domain:    pipelineDomain,
        url:       pipelineUrl,
      },
      nlp: {
        online:    nlpHealth.online,
        latencyMs: nlpHealth.latencyMs,
      },
      mongodb:  { online: true },
      xgboost:  { loaded: xgboostLoaded },
    },
    metrics: {
      unprocessedArticles,
      articlesOlderThan48h,
      totalNewsToday,
      newUsersToday,
    },
    errorLogs:   errorLogs.slice(0, 50),
    warningLogs: warningLogs.slice(0, 50),
    sentimentBreakdown,
    pipelineStats,
    security: {
      nextAuthSecretConfigured: Boolean(process.env.NEXTAUTH_SECRET),
      adminCount,
      failedLogins24h,
      activeSessions:           activeSessionCount,
      totalUsers,
    },
    timestamp: now.toISOString(),
  });
}
