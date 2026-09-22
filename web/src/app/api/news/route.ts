import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limitParam = url.searchParams.get('limit');
    const all = url.searchParams.get('all') === 'true';

    // Default limit to 100 so all news coming on that day are captured dynamically
    let limit = 100;
    if (all) {
      limit = 0;
    } else if (limitParam) {
      limit = Math.max(1, parseInt(limitParam));
    }
    const skip = all ? 0 : Math.max(0, (page - 1) * limit);

    await connectToDatabase();
    
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    const collection = mongoose.connection.db.collection('news');
    
    // 24-Hour (1 Day) Filter with 3-Hour Pending Verification Window
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
    
    const query = {
      $or: [
        // All articles within the active 24-hour (1 day) cycle
        { published_at: { $gte: twentyFourHoursAgo } },
        { scraped_at: { $gte: twentyFourHoursAgo } },
        { createdAt: { $gte: twentyFourHoursAgo } },
        // Plus any article released within the last 3 hours (so pending 3h predictions remain in the new day until verified)
        { published_at: { $gte: threeHoursAgo } },
        { scraped_at: { $gte: threeHoursAgo } }
      ]
    };

    const countActive = await collection.countDocuments(query);
    const effectiveQuery = countActive > 0 ? query : {};

    const cursor = collection
      .find(effectiveQuery)
      .sort({ published_at: -1, scraped_at: -1, createdAt: -1 })
      .skip(skip);

    if (limit > 0) {
      cursor.limit(limit);
    }

    const news = await cursor.toArray();

    // Map `_id` from ObjectId to string so it serializes properly to JSON
    const serializedNews = news.map(item => ({
      ...item,
      _id: item._id.toString()
    }));

    return NextResponse.json(
      { news: serializedNews },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
