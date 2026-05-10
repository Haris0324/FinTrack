import mongoose from 'mongoose';

const SessionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  device: {
    type: String,
    default: 'Unknown Device',
  },
  browser: {
    type: String,
    default: 'Unknown Browser',
  },
  ip: {
    type: String,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

export default mongoose.models.SessionLog || mongoose.model('SessionLog', SessionLogSchema);
