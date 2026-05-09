import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  providers: {
    type: [String],
    default: ['credentials'],
  },
  isVerified: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
