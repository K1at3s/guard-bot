import { Events, AuditLogEvent, EmbedBuilder, Colors, PermissionsBitField } from "discord.js";
import { settings, isExempt, claimAudit, punish, attempt, sendLog, logExempt } from "../Utils/guard.js";
import { freshAudit } from "../Utils/audit.js";

const TYPES = new Set([AuditLogEvent.ChannelOverwriteCreate, AuditLogEvent.ChannelOverwriteUpdate, AuditLogEvent.ChannelOverwriteDelete]);
export default {
  name: Events.GuildAuditLogEntryCreate, roles: ["guard2"],
  async execute(entry, guild) {
    if (!TYPES.has(entry.action) || !entry.executor || !freshAudit(entry)) return;
    const data = await settings(guild.id);
    if (!data.guards.channel.enabled || !claimAudit(guild.id, entry, "channel-permissions")) return;
    if (isExempt(guild, entry.executor.id, data)) return logExempt(guild, "channel", entry.executor.tag, "kanal izni değiştirdi");
    const targetId = entry.extra?.id;
    const channelId = entry.targetId ?? entry.target?.id;
    const result = await punish(guild, entry.executor.id, data.guards.channel.punish, "İzinsiz kanal izni değişikliği");
    const restored = await attempt(guild, "Kanal izinlerini geri alma", async () => {
      const channel = await guild.channels.fetch(channelId);
      if (!channel?.permissionOverwrites || !targetId) throw new Error("Kanal veya izin hedefi doğrulanamadı");
      const current = channel.permissionOverwrites.cache.get(targetId);
      if (entry.action === AuditLogEvent.ChannelOverwriteDelete && current) throw new Error("İzin kaydı daha sonra yeniden oluşturulmuş; eski durum uygulanmadı");
      if (entry.action !== AuditLogEvent.ChannelOverwriteDelete) {
        if (!current) throw new Error("İzin kaydı artık mevcut değil");
        for (const key of ["allow", "deny"]) {
          const change = entry.changes?.find((change) => change.key === key);
          if ((change || entry.action === AuditLogEvent.ChannelOverwriteCreate)
            && current[key].bitfield !== BigInt(change?.new ?? 0)) throw new Error("İzinler audit kaydından sonra değişmiş; eski durum uygulanmadı");
        }
      }
      if (entry.action === AuditLogEvent.ChannelOverwriteCreate) return channel.permissionOverwrites.delete(targetId, "Guard: izinsiz izin kaydı");
      const oldValue = (key) => {
        const change = entry.changes?.find((change) => change.key === key);
        return change ? BigInt(change.old ?? 0) : current?.[key]?.bitfield ?? 0n;
      };
      const allow = new PermissionsBitField(oldValue("allow"));
      const deny = new PermissionsBitField(oldValue("deny"));
      if (entry.action === AuditLogEvent.ChannelOverwriteDelete && !entry.changes?.some((change) => change.key === "allow" || change.key === "deny")) throw new Error("Eski izinler audit kaydında yok");
      const permissions = Object.fromEntries(Object.entries(PermissionsBitField.Flags).map(([name, bit]) => [name, allow.has(bit, false) ? true : deny.has(bit, false) ? false : null]));
      const type = guild.roles.cache.has(targetId) ? 0 : 1;
      await channel.permissionOverwrites.edit(targetId, permissions, { type, reason: "Guard: kanal izinleri geri alındı" });
    });
    const targetLabel = targetId ? (guild.roles.cache.get(targetId)?.name ?? guild.members.cache.get(targetId)?.user?.tag ?? `<@${targetId}>`) : "Bilinmiyor";
    const channelLabel = guild.channels.cache.get(channelId)?.name ?? channelId ?? "Bilinmiyor";
    return sendLog(guild, "channel", new EmbedBuilder().setColor(Colors.Red).setTitle("Kanal İzin Koruması")
      .addFields({ name: "Yetkili", value: `${entry.executor.tag} (\`${entry.executor.id}\`)` }, { name: "Kanal / izin hedefi", value: `${channelLabel} / ${targetLabel}` },
        { name: "Ceza", value: result }, { name: "Geri alma", value: restored }).setTimestamp());
  },
};
