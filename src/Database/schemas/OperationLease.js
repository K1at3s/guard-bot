import mongoose from "mongoose";
const schema = new mongoose.Schema({
  _id: String, owner: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.models.OperationLease || mongoose.model("OperationLease", schema);
