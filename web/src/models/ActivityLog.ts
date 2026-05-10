import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Success', 'Warning', 'Failed'],
    default: 'Success',
  },
  type: {
    type: String,
    enum: ['success', 'warning', 'danger'],
    default: 'success',
  },
  ip: {
    type: String,
  }
}, { timestamps: true });

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
