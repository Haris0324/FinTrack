import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { requireAdmin } from '@/lib/adminAuth';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintrack';

const HARDCODED_SOURCES = [
  { name: 'CoinTelegraph', displayUrl: 'cointelegraph.com', matchKeywords: ['Cointelegraph', 'CoinTelegraph'] },
  { name: 'CoinDesk',      displayUrl: 'coindesk.com',      matchKeywords: ['CoinDesk', 'Coindesk'] },
  { name: 'CryptoPanic',   displayUrl: 'cryptopanic.com',   matchKeywords: ['CryptoPanic', 'Cryptopanic'] },
  { name: 'Reuters (BTC)', displayUrl: 'news.google.com',   matchKeywords: ['Reuters', 'reuters'] },
  { name: 'Bloomberg (BTC)',displayUrl: 'news.google.com',  matchKeywords: ['Bloomberg', 'bloomberg'] },
];

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('fintrack');
    const news = db.collection('news');

    const now = new Date();
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const h1  = new Date(now.getTime() - 60 * 60 * 1000);
    const d7  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const enriched = await Promise.all(
      HARDCODED_SOURCES.map(async (src) => {
        const regex = new RegExp(src.matchKeywords.join('|'), 'i');
        const [count24h, count1h, count7d] = await Promise.all([
          news.countDocuments({ source: { $regex: regex }, scraped_at: { $gte: h24 } }),
          news.countDocuments({ source: { $regex: regex }, scraped_at: { $gte: h1 } }),
          news.countDocuments({ source: { $regex: regex }, scraped_at: { $gte: d7 } }),
        ]);
        return {
          name: src.name,
          displayUrl: src.displayUrl,
          status: 'Active',
          articles24h: count24h,
          articles1h: count1h,
          articles7d: count7d,
          scrapeInterval: '1 min',
          type: 'RSS Feed',
        };
      })
    );

    const totalToday = enriched.reduce((s, r) => s + r.articles24h, 0);

    return NextResponse.json({ sources: enriched, totalToday });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch source stats' }, { status: 500 });
  } finally {
    await client.close();
  }
}
