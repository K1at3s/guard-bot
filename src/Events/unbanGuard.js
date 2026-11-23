import { Events, EmbedBuilder, Colors, AuditLogEvent } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, hit, logExempt, claimAudit } from "../Utils/guard.js";

export default {
  name: Events.GuildBanRemove,
  roles: ["guard1"],
  async execute(ban) {
    const { guild, user } = ban;
    const log = guild.client.logger;
    try {
      const data = await settings(guild.id);
      if (!data.guards.ban?.enabled) return;
      const entry = await auditEntry(guild, AuditLogEvent.MemberBanRemove, user.id);
      if (!entry?.executor || !claimAudit(guild.id, entry, "unbanGuard")) return;
      if (isExempt(guild, entry.executor.id, data)) {
        await logExempt(guild, "ban", entry.executor.tag, `\`${user.tag}\` adlı üyenin banını kaldırdı`);
        return;
      }
      const limit = data.limits?.ban ?? 3;
      if (hit(`${guild.id}:unban:${entry.executor.id}`, 60000) < limit) return;
      const res = await punish(guild, entry.executor.id, data.guards.ban.punish, `Limit üstü ban kaldırma (${limit}/dk)`);
      const restored = await guild.members.ban(user.id, { reason: "Guard: izinsiz ban kaldırma." }).then(() => "Başarılı").catch(() => "Başarısız");
      await sendLog(guild, "ban", new EmbedBuilder().setColor(Colors.Red)
        .setTitle("🚫 Ban Koruma").setDescription(`**${entry.executor.tag}** limit üstü ban kaldırdı.`)
        .addFields(
          { name: "Hedef", value: `${user.tag}`, inline: true },
          { name: "Ceza", value: `\`${res}\``, inline: true }
          , { name: "Hedefi tekrar banlama", value: restored }
        ).setTimestamp());
    } catch (err) { log.error(`[unbanGuard] ${err.message}`); }
  },
};
