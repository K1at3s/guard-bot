import mongoose from "mongoose";

const schema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  targetId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, maxlength: 1024 },
  details: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
schema.index({ guildId: 1, targetId: 1, createdAt: -1 });
export default mongoose.models.Case || mongoose.model("Case", schema);
