import mongoose, { Schema } from "mongoose";

const SwapTradeHistorySchema = new Schema({
  userId: { type: String, required: true },
  direction: { type: String, enum: ["BTC_TO_ETH", "ETH_TO_BTC"], required: true },
  sourceChain: { type: String, enum: ["BTC", "ETH"], required: true },
  txHash: { type: String, required: true, lowercase: true },
  createdAt: { type: Date, required: true, default: Date.now },
}, { versionKey: false });

SwapTradeHistorySchema.index({ userId: 1, txHash: 1 }, { unique: true });
SwapTradeHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.SwapTradeHistory ||
  mongoose.model("SwapTradeHistory", SwapTradeHistorySchema);
