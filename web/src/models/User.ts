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
  },
  profilePicture: {
    type: String,
    default: "",
  },
  phone: {
    type: String,
    default: "",
  },
  company: {
    type: String,
    default: "",
  },
  position: {
    type: String,
    default: "",
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorCode: {
    type: String,
  },
  twoFactorExpires: {
    type: Date,
  }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
