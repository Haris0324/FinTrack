import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectToDatabase();
    
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    const collection = mongoose.connection.db.collection('news');
    
    const totalArticles = await collection.countDocuments();
    
    // Aggregate overall sentiment distribution
    const sentimentDist = await collection.aggregate([
      {
        $group: {
          _id: "$sentiment",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Aggregate sentiment by top sources
    const sourceSentiment = await collection.aggregate([
      {
        $group: {
          _id: { source: "$source", sentiment: "$sentiment" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.source",
          sentiments: {
            $push: {
              k: "$_id.sentiment",
              v: "$count"
            }
          }
        }
      },
      { $sort: { "_id": 1 } },
      { $limit: 8 }
    ]).toArray();

    // Extract tags (Entities)
    const entitiesDist = await collection.aggregate([
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 12 }
    ]).toArray();

    // Format Data
    let pos = 0;
    let neg = 0;
    let neu = 0;
    
    sentimentDist.forEach(s => {
      if (s._id === 'POSITIVE') pos = s.count;
      if (s._id === 'NEGATIVE') neg = s.count;
      if (s._id === 'NEUTRAL') neu = s.count;
    });

    const overallSentiment = {
      positive: pos,
      negative: neg,
      neutral: neu
    };

    const sources = sourceSentiment.map(s => {
      const sentMap = s.sentiments.reduce((acc: any, curr: any) => ({...acc, [curr.k]: curr.v}), {});
      return {
        name: s._id || 'Unknown',
        pos: sentMap['POSITIVE'] || 0,
        neg: sentMap['NEGATIVE'] || 0,
        neu: sentMap['NEUTRAL'] || 0
      };
    });

    return NextResponse.json({ 
      totalArticles, 
      overallSentiment,
      sources,
      entitiesDist
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
