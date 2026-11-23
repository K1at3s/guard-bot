import mongoose from "mongoose";

const schema = new mongoose.Schema({
  _id: String, guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true }, reason: String,
}, { timestamps: true });
export default mongoose.models.Quarantine || mongoose.model("Quarantine", schema);
