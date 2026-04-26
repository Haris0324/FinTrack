import mongoose from 'mongoose';

const NewsItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
  source: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
  },
  publishedAt: {
    type: Date,
    required: true,
  },
  scrapedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Create text index for search
NewsItemSchema.index({ title: 'text', content: 'text', summary: 'text' });

export default mongoose.models.NewsItem || mongoose.model('NewsItem', NewsItemSchema);
