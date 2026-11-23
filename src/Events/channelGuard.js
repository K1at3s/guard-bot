import { Events, EmbedBuilder, Colors, AuditLogEvent, ChannelType } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, logExempt, claimAudit, attempt } from "../Utils/guard.js";
import { matchesChanges } from "../Utils/audit.js";

export default {
  name: [Events.ChannelCreate, Events.ChannelDelete, Events.ChannelUpdate, Events.ThreadDelete],
  roles: ["guard2"],
  async execute(...args) {
    const channel = args[0];
    const guild = channel.guild;
    const log = guild.client.logger;
    try {
      const data = await settings(guild.id);
      const g = data.guards.channel;
      if (!g?.enabled) return;
      const isThread = typeof channel.isThread === "function" ? channel.isThread() : false;
      const type = isThread ? "Thread" : channel.isVoiceBased() ? "Ses" : channel.type === ChannelType.GuildCategory ? "Kategori" : "Yazı";

      if (channel.partial) return;
      // Silme: kanalı geri aç + cezalandır (thread geri açılmaz, sadece ceza)
      if (this.eventName === Events.ChannelDelete || this.eventName === Events.ThreadDelete || (args.length === 1 && !guild.channels.cache.has(channel.id))) {
        const entry = await auditEntry(guild, isThread ? AuditLogEvent.ThreadDelete : AuditLogEvent.ChannelDelete, channel.id);
        if (!entry?.executor || !claimAudit(guild.id, entry, "channelGuard")) return;
        if (isExempt(guild, entry.executor.id, data)) {
          await logExempt(guild, "channel", entry.executor.tag, `\`${channel.name}\` kanalını sildi`);
          return;
        }
        const res = await punish(guild, entry.executor.id, g.punish, "Kanal/thread sildi");
        let clone = null;
        if (!isThread) {
          clone = await channel.clone({ reason: "Guard: silinen kanal geri yüklendi." }).catch(() => null);
          if (clone) await clone.setPosition(channel.rawPosition).catch((err) => log.error(`[channelGuard:position] ${err.message}`));
        }
        await sendLog(guild, "channel", new EmbedBuilder().setColor(Colors.Red)
          .setTitle("📺 Kanal Koruma").setDescription(`**${entry.executor.tag}** ${type} kanalı sildi.`)
          .addFields(
            { name: "Kanal", value: `\`${channel.name}\``, inline: true },
            { name: "Geri Açıldı", value: clone ? "✅" : "❌", inline: true },
            { name: "Ceza", value: `\`${res}\``, inline: true }
          ).setTimestamp());
        return;
      }
      // Oluşturmayı kaldır; güncellemeyi eski ayarlara döndür.
      if (args.length > 1 && args[1].equals?.(channel)) return;
      const entry = await auditEntry(guild, args.length === 1 ? AuditLogEvent.ChannelCreate : AuditLogEvent.ChannelUpdate, channel.id, 10,
        (entry) => args.length === 1 || matchesChanges(entry, channel, args[1], {
          name: "name", topic: "topic", nsfw: "nsfw", parent_id: "parentId", rate_limit_per_user: "rateLimitPerUser",
          bitrate: "bitrate", user_limit: "userLimit", rtc_region: "rtcRegion", position: "rawPosition",
        }));
      if (!entry?.executor || !claimAudit(guild.id, entry, "channelGuard")) return;
      if (isExempt(guild, entry.executor.id, data)) {
        await logExempt(guild, "channel", entry.executor.tag, `${channel} kanalında işlem yaptı`);
        return;
      }
      const isCreate = args.length === 1;
      const res = await punish(guild, entry.executor.id, g.punish, isCreate ? "Kanal oluşturdu" : "Kanal güncelledi");
      const restored = await attempt(guild, "Kanal müdahale", async () => {
        if (isCreate) return channel.delete("Guard: izinsiz kanal.");
        const current = args[1];
        const keys = { name: "name", parent_id: "parent", topic: "topic", nsfw: "nsfw", rate_limit_per_user: "rateLimitPerUser", bitrate: "bitrate", user_limit: "userLimit", rtc_region: "rtcRegion" };
        const patch = { reason: "Guard: kanal ayarları geri alındı" };
        for (const change of entry.changes ?? []) if (Object.hasOwn(keys, change.key)) {
          const option = keys[change.key];
          patch[option] = option === "parent" ? channel.parentId : channel[option];
        }
        await current.edit(patch);
        if (entry.changes.some((change) => change.key === "position")) await current.setPosition(channel.rawPosition);
      });
      await sendLog(guild, "channel", new EmbedBuilder().setColor(Colors.Red)
        .setTitle("📺 Kanal Koruma").setDescription(`**${entry.executor.tag}** ${type} kanalında işlem yaptı.`)
        .addFields(
          { name: "Kanal", value: `${channel}`, inline: true },
          { name: "Ceza", value: `\`${res}\``, inline: true },
          { name: "Müdahale", value: restored }
        ).setTimestamp());
    } catch (err) { log.error(`[channelGuard] ${err.message}`); }
  },
};
