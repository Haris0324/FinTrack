import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongoose";
import { isCurrentAdmin } from "@/lib/admin-auth";
import ActivityLog from "@/models/ActivityLog";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import path from "node:path";

type SourceConfig = { name: string; url: string; enabled: boolean };
type AdminConfig = { _id: string; sources?: SourceConfig[]; watchKeywords?: string[]; highImpactThresholdPct?: number; emailAlertsEnabled?: boolean; alertEmail?: string };
type ModelMetadata = {
  version?: string; direction_accuracy?: number; impact_accuracy?: number;
  n_train_samples?: number; n_features?: number; direction_threshold?: number;
  high_impact_threshold?: number; status?: string;
};
type PipelineRuntime = { [key: string]: unknown; status?: string; startedAt?: Date; completedAt?: Date; durationMs?: number; articlesInserted?: number; errorCount?: number; lastErrorType?: string | null; notificationErrorType?: string | null };

const DEFAULT_SOURCES: SourceConfig[] = [
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss", enabled: true },
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", enabled: true },
  { name: "CryptoPanic", url: "https://cryptopanic.com/news/rss/", enabled: true },
  { name: "Google News: Reuters", url: "https://news.google.com/rss/search?q=bitcoin+reuters", enabled: true },
  { name: "Google News: Bloomberg", url: "https://news.google.com/rss/search?q=bitcoin+bloomberg", enabled: true },
];

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(await isCurrentAdmin(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database unavailable");
    const news = db.collection("news");
    const configCollection = db.collection<AdminConfig>("adminconfig");
    const config = await configCollection.findOne({ _id: "configuration" });
    const sources = Array.isArray(config?.sources) ? config.sources : DEFAULT_SOURCES;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalArticles, articles24h, highImpact, latestArticle, sourceCounts, users, logs, pipeline] = await Promise.all([
      news.countDocuments(),
      news.countDocuments({ $or: [{ scraped_at: { $gte: since } }, { createdAt: { $gte: since } }] }),
      news.countDocuments({ impact: "HIGH IMPACT" }),
      news.findOne({}, { sort: { scraped_at: -1, createdAt: -1 }, projection: { scraped_at: 1, createdAt: 1 } }),
      news.aggregate([
        { $match: { $or: [{ scraped_at: { $gte: since } }, { createdAt: { $gte: since } }] } },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("users").countDocuments(),
      ActivityLog.find().sort({ createdAt: -1 }).limit(8).select("action status type createdAt ip").lean(),
      db.collection<PipelineRuntime & { _id: string }>("pipelinestats").findOne({ _id: "admin_runtime" }),
    ]) as [number, number, number, { scraped_at?: Date; createdAt?: Date } | null, { _id?: unknown; count: number }[], number, { _id: mongoose.Types.ObjectId; action: string; status: string; type: string; createdAt: Date; ip?: string }[], PipelineRuntime | null];
    const enrichedSources = sources.map(source => ({
      ...source,
      articles24h: sourceCounts.filter(row => String(row._id || "").toLowerCase().includes(source.name.toLowerCase())).reduce((sum, row) => sum + row.count, 0),
    }));
    const lastScrapedAt = latestArticle?.scraped_at ?? latestArticle?.createdAt ?? null;

    let model: ModelMetadata | null = null;
    try {
      model = JSON.parse(await readFile(path.join(process.cwd(), "src", "data", "model_metadata.json"), "utf8"));
    } catch {
      // Model metadata is bundled with the web app and refreshed by the training script.
    }

    return NextResponse.json({
      metrics: {
        totalArticles, articles24h, highImpact, users,
        lastScrapedAt,
        isIngestionRecent: Boolean(lastScrapedAt && Date.now() - lastScrapedAt.getTime() < 30 * 60 * 1000),
        sourceCount: sources.length,
        activeSourceCount: sources.filter(source => source.enabled).length,
      },
      pipeline: pipeline ? {
        status: pipeline.status || "unknown",
        completedAt: pipeline.completedAt || null,
        durationMs: pipeline.durationMs ?? null,
        articlesInserted: pipeline.articlesInserted ?? null,
        errorCount: pipeline.errorCount ?? 0,
        lastErrorType: pipeline.lastErrorType || null,
        notificationErrorType: pipeline.notificationErrorType || null,
      } : null,
      sources: enrichedSources,
      keywords: Array.isArray(config?.watchKeywords) ? config.watchKeywords : [],
      settings: {
        highImpactThresholdPct: typeof config?.highImpactThresholdPct === "number" ? config.highImpactThresholdPct : 2.0,
        emailAlertsEnabled: config?.emailAlertsEnabled === true,
        alertEmail: config?.alertEmail || session?.user?.email || "",
      },
      logs,
      model: model ? {
        version: model.version || "Unknown",
        directionAccuracy: typeof model.direction_accuracy === "number" ? model.direction_accuracy : null,
        impactAccuracy: typeof model.impact_accuracy === "number" ? model.impact_accuracy : null,
        trainingSamples: model.n_train_samples ?? null,
        featureCount: model.n_features ?? null,
        directionThreshold: model.direction_threshold ?? null,
        highImpactThreshold: model.high_impact_threshold ?? null,
        status: model.status || "Unknown",
      } : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json({ error: "Could not load admin metrics" }, { status: 500 });
  }
}
