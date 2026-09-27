import mongoose, { Schema } from "mongoose";

const AdminInviteSchema = new Schema({
  name: { type: String, required: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, unique: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expires: { type: Date, required: true, expires: 0 },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export default mongoose.models.AdminInvite || mongoose.model("AdminInvite", AdminInviteSchema);
