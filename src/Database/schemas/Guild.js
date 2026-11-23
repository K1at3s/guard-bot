import mongoose from "mongoose";

// Tek şema: tüm guard yapılandırması burada
const GuardState = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  punish: { type: String, enum: ["quarantine", "kick", "ban"], default: "quarantine" },
}, { _id: false });
const ServiceState = new mongoose.Schema({ userId: String, lastSeen: Date }, { _id: false });

const GuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  safelist: { type: [String], default: [] },
  guardBots: { type: [String], default: [] },
  services: { type: Map, of: ServiceState, default: () => new Map() },
  channelLocks: [{ channelId: String, sendMessages: { type: Boolean, default: null } }],
  warningPolicy: {
    threshold: { type: Number, default: 3, min: 1, max: 20 },
    timeoutMs: { type: Number, default: 1800000, min: 1000, max: 2419200000 },
  },
  raidPolicy: {
    windowMs: { type: Number, default: 10000, min: 1000, max: 60000 },
    durationMs: { type: Number, default: 300000, min: 60000, max: 3600000 },
    minAccountAgeHours: { type: Number, default: 0, min: 0, max: 720 },
  },
  messagePolicy: {
    invites: { type: Boolean, default: true },
    scam: { type: Boolean, default: true },
    mentions: { type: Number, default: 5, min: 1, max: 50 },
    flood: { type: Number, default: 5, min: 2, max: 30 },
    floodWindowMs: { type: Number, default: 5000, min: 1000, max: 60000 },
    duplicates: { type: Number, default: 3, min: 2, max: 20 },
    emojis: { type: Number, default: 10, min: 2, max: 100 },
    capsPercent: { type: Number, default: 70, min: 10, max: 100 },
    capsMinLength: { type: Number, default: 10, min: 5, max: 100 },
    timeoutMs: { type: Number, default: 600000, min: 1000, max: 2419200000 },
    ignoredChannels: { type: [String], default: [] },
  },
  quarantineRole: String,
  raidUntil: { type: Date, default: null },
  tagRole: String,
  logCategoryId: String,
  logs: {
    ban: String, kick: String, bot: String, channel: String, role: String,
    emoji: String, sticker: String, webhook: String, server: String,
    tag: String, raid: String, mod: String, message: String, timeout: String,
  },
  guards: {
    ban: { type: GuardState, default: () => ({}) },
    kick: { type: GuardState, default: () => ({}) },
    bot: { type: GuardState, default: () => ({}) },
    raid: { type: GuardState, default: () => ({}) },
    channel: { type: GuardState, default: () => ({}) },
    role: { type: GuardState, default: () => ({}) },
    emoji: { type: GuardState, default: () => ({}) },
    sticker: { type: GuardState, default: () => ({}) },
    webhook: { type: GuardState, default: () => ({}) },
    server: { type: GuardState, default: () => ({}) },
    message: { type: GuardState, default: () => ({}) },
    tag: { type: GuardState, default: () => ({}) },
    timeout: { type: GuardState, default: () => ({}) },
  },
  limits: {
    ban: { type: Number, default: 3 },
    kick: { type: Number, default: 3 },
    joins: { type: Number, default: 5 },
    timeout: { type: Number, default: 4 },
  },
  warns: [{
    userId: String, modId: String, reason: String, at: { type: Date, default: Date.now },
  }],
  commandChannels: { type: [String], default: [] },
  disabledChannels: { type: [String], default: [] },
});

export default mongoose.models.Guild || mongoose.model("Guild", GuildSchema);
