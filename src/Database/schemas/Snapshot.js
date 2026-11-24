import mongoose from "mongoose";

// Sunucu yapı yedeği (rol + kanal). En fazla 3 yedek tutulur.
const SnapshotSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: String,
  restoredRoles: [{ oldId: String, newId: String }],
  restoredChannels: [{ oldId: String, newId: String }],
  roles: [{
    oldId: String, name: String, color: Number, hoist: Boolean,
    permissions: [String], mentionable: Boolean, position: Number,
    members: { type: [String], default: [] },
  }],
  channels: [{
    oldId: String, name: String, kind: Number, parentOldId: String,
    position: Number, topic: String, nsfw: Boolean,
    rateLimit: Number, userLimit: Number, bitrate: Number, rtcRegion: String,
    defaultAutoArchiveDuration: Number,
    overwrites: [{ id: String, type: { type: Number }, allow: [String], deny: [String] }],
  }],
});

export default mongoose.models.Snapshot || mongoose.model("Snapshot", SnapshotSchema);
