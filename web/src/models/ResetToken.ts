import mongoose, { Schema, Document } from "mongoose";

export interface IResetToken extends Document {
  email: string;
  token: string;
  expires: Date;
}

const ResetTokenSchema = new Schema<IResetToken>({
  email: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expires: {
    type: Date,
    required: true,
  },
});

export default mongoose.models.ResetToken || mongoose.model<IResetToken>("ResetToken", ResetTokenSchema);
