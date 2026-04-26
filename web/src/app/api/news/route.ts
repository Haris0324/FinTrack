import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Ensure the connection is established
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    // The python scraper inserts into the 'news' collection
    const collection = mongoose.connection.db.collection('news');
    
    const news = await collection
      .find({})
      .sort({ scraped_at: -1 })
      .limit(20)
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
