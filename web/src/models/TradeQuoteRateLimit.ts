import mongoose, { Schema } from "mongoose";

const TradeQuoteRateLimitSchema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

TradeQuoteRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.TradeQuoteRateLimit ||
  mongoose.model("TradeQuoteRateLimit", TradeQuoteRateLimitSchema);
