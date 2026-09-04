import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    await connectToDatabase();
    
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    const collection = mongoose.connection.db.collection('news');
    
    // Strict 48-Hour (2 Days) Filter at API level
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000);
    
    const query = {
      $or: [
        { published_at: { $gte: fortyEightHoursAgo } },
        { scraped_at: { $gte: fortyEightHoursAgo } },
        { createdAt: { $gte: fortyEightHoursAgo } }
      ]
    };

    const news = await collection
      .find(query)
      .sort({ published_at: -1, scraped_at: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Map `_id` from ObjectId to string so it serializes properly to JSON
    const serializedNews = news.map(item => ({
      ...item,
      _id: item._id.toString()
    }));

    return NextResponse.json({ news: serializedNews });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
