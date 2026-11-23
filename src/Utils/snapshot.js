import { ChannelType } from "discord.js";
import Snapshot from "../Database/schemas/Snapshot.js";
import { acquireLease } from "./lease.js";

export const MAX_SNAP = 3;
const busy = new Set();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const COPYABLE = new Set([
  ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory,
  ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice, ChannelType.GuildForum,
]);

export async function takeSnapshot(guild, createdBy, log) {
  if (busy.has(guild.id)) throw new Error("Bu sunucuda yedek işlemi sürüyor.");
  busy.add(guild.id);
  let lease;
  try {
  lease = await acquireLease(`structure:${guild.id}`);
  await Promise.all([guild.members.fetch(), guild.roles.fetch(), guild.channels.fetch()]);
  const roles = [...guild.roles.cache.values()]
    .filter((r) => r.id !== guild.id && !r.managed)
    .map((r) => ({ oldId: r.id, name: r.name, color: r.color, hoist: r.hoist, permissions: r.permissions.toArray(), mentionable: r.mentionable, position: r.position, members: [...r.members.keys()] }));
  const channels = [...guild.channels.cache.values()]
    .filter((c) => COPYABLE.has(c.type))
    .map((c) => ({
      oldId: c.id, name: c.name, kind: c.type, parentOldId: c.parentId, position: c.position,
      topic: c.topic ?? null, nsfw: c.nsfw ?? false,
      rateLimit: c.rateLimitPerUser ?? 0, userLimit: c.userLimit ?? 0,
      bitrate: c.bitrate, rtcRegion: c.rtcRegion, defaultAutoArchiveDuration: c.defaultAutoArchiveDuration,
      overwrites: [...c.permissionOverwrites.cache.values()].map((o) => ({
        id: o.id, type: o.type, allow: o.allow.toArray(), deny: o.deny.toArray(),
      })),
    }));
  lease.assert();
  await Snapshot.create({ guildId: guild.id, createdBy, roles, channels });
  const excess = await Snapshot.find({ guildId: guild.id }).sort({ createdAt: -1 }).skip(MAX_SNAP);
  for (const old of excess) { lease.assert(); await Snapshot.deleteOne({ _id: old._id }); }
  log?.info(`[Snapshot] ${guild.name}: yedek alındı (${roles.length} rol, ${channels.length} kanal).`);
  return { roles: roles.length, channels: channels.length };
  } finally {
    busy.delete(guild.id);
    await lease?.release().catch((err) => log?.error(`[Snapshot kilidi] ${err.message}`));
  }
}

export async function restoreGuild(guild, snap, log) {
  if (snap.guildId !== guild.id) throw new Error("Yedek farklı sunucuya ait.");
  if (busy.has(guild.id)) throw new Error("Bu sunucuda yedek işlemi sürüyor.");
  busy.add(guild.id);
  let lease;
  try {
  lease = await acquireLease(`structure:${guild.id}`);
  if (snap._id) {
    snap = await Snapshot.findOne({ _id: snap._id, guildId: guild.id });
    if (!snap) throw new Error("Yedek kaydı bulunamadı; geri yükleme durduruldu.");
  }
  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
  const res = { roles: 0, rolesRe: 0, channels: 0, channelsRe: 0, failed: 0, errors: [] };
  const failure = (label, err) => { res.failed++; res.errors.push(label); log?.error(`[Snapshot] ${label}: ${err.message}`); return null; };
  const roleMap = new Map();
  const previousRoles = new Map((snap.restoredRoles ?? []).map((r) => [r.oldId, r.newId]));
  const previousChannels = new Map((snap.restoredChannels ?? []).map((c) => [c.oldId, c.newId]));

  for (const r of [...snap.roles].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
    lease.assert();
    const existing = guild.roles.cache.get(r.oldId) ?? guild.roles.cache.get(previousRoles.get(r.oldId));
    if (existing) { roleMap.set(r.oldId, existing.id); res.rolesRe++; continue; }
    const created = await guild.roles.create({
      name: r.name, color: r.color, hoist: r.hoist,
      permissions: r.permissions, mentionable: r.mentionable, reason: "Snapshot geri yükleme.",
    }).catch((err) => failure(`Rol: ${r.name}`, err));
    if (created) {
      roleMap.set(r.oldId, created.id);
      res.roles++;
      const saved = await Snapshot.updateOne({ _id: snap._id, guildId: guild.id }, { $push: { restoredRoles: { oldId: r.oldId, newId: created.id } } });
      if (!saved.matchedCount) throw new Error("Yedek kaydı kayboldu; geri yükleme durduruldu.");
      if (typeof r.position === "number") await created.setPosition(r.position).catch((err) => failure(`Rol sırası: ${r.name}`, err));
    }
    await sleep(800); // rate-limit dostu
  }

  const chMap = new Map();
  const placed = []; // [channel, position] — ikinci turda dizilir
  const ordered = [...snap.channels].sort((a, b) =>
    (a.kind === ChannelType.GuildCategory ? 0 : 1) - (b.kind === ChannelType.GuildCategory ? 0 : 1));
  for (const c of ordered) {
    lease.assert();
    const parentId = c.parentOldId ? (chMap.get(c.parentOldId) ?? null) : null;
    const existing = guild.channels.cache.get(c.oldId) ?? guild.channels.cache.get(previousChannels.get(c.oldId));
    if (existing) { chMap.set(c.oldId, existing.id); res.channelsRe++; continue; }
    if (c.parentOldId && !parentId) { failure(`Kategori bulunamadı: ${c.name}`, new Error("Üst kategori oluşturulamadı")); continue; }
    const missingRole = (c.overwrites || []).find((o) => (o.type === 0 || snap.roles.some((r) => r.oldId === o.id)) && o.id !== guild.id && !roleMap.has(o.id) && !guild.roles.cache.has(o.id));
    if (missingRole) { failure(`İzin rolü eksik: ${c.name}`, new Error(missingRole.id)); continue; }
    const overwrites = (c.overwrites || [])
      .map((o) => ({ id: roleMap.get(o.id) ?? o.id, type: o.type, allow: o.allow, deny: o.deny }));
    const created = await guild.channels.create({
      name: c.name, type: c.kind, parent: parentId,
      topic: c.topic, nsfw: c.nsfw, rateLimitPerUser: c.rateLimit || undefined,
      ...(c.kind === ChannelType.GuildVoice || c.kind === ChannelType.GuildStageVoice ? { userLimit: c.userLimit, bitrate: c.bitrate, rtcRegion: c.rtcRegion } : {}),
      ...(c.defaultAutoArchiveDuration ? { defaultAutoArchiveDuration: c.defaultAutoArchiveDuration } : {}),
      permissionOverwrites: overwrites, reason: "Snapshot geri yükleme.",
    }).catch((err) => failure(`Kanal: ${c.name}`, err));
    if (created) {
      chMap.set(c.oldId, created.id);
      res.channels++;
      const saved = await Snapshot.updateOne({ _id: snap._id, guildId: guild.id }, { $push: { restoredChannels: { oldId: c.oldId, newId: created.id } } });
      if (!saved.matchedCount) throw new Error("Yedek kaydı kayboldu; geri yükleme durduruldu.");
      if (typeof c.position === "number") placed.push([created, c.position]);
    }
    await sleep(800);
  }
  for (const [ch, pos] of placed) {
    lease.assert();
    await ch.setPosition(pos).catch((err) => failure(`Kanal sırası: ${ch.name}`, err));
    await sleep(800);
  }
  log?.warn(`[Snapshot] ${guild.name}: geri yükleme (${res.roles + res.channels} oluşturuldu).`);
  return res;
  } finally {
    busy.delete(guild.id);
    await lease?.release().catch((err) => log?.error(`[Snapshot kilidi] ${err.message}`));
  }
}

export function snapshotPlan(guild, snap) {
  const roleIds = new Map((snap.restoredRoles ?? []).map((r) => [r.oldId, r.newId]));
  const channelIds = new Map((snap.restoredChannels ?? []).map((c) => [c.oldId, c.newId]));
  return {
    roles: snap.roles.filter((r) => !guild.roles.cache.has(r.oldId) && !guild.roles.cache.has(roleIds.get(r.oldId))),
    channels: snap.channels.filter((c) => !guild.channels.cache.has(c.oldId) && !guild.channels.cache.has(channelIds.get(c.oldId))),
  };
}
