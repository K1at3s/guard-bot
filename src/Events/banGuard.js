import { Events, EmbedBuilder, Colors, AuditLogEvent } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, hit, logExempt, claimAudit } from "../Utils/guard.js";

export default {
  name: Events.GuildBanAdd,
  roles: ["guard1"],
  async execute(ban) {
    const { guild, user } = ban;
    const log = guild.client.logger;
    try {
      const data = await settings(guild.id);
      const g = data.guards.ban;
      if (!g?.enabled) return;
      const entry = await auditEntry(guild, AuditLogEvent.MemberBanAdd, user.id);
      if (!entry?.executor || !claimAudit(guild.id, entry, "banGuard")) return;
      if (isExempt(guild, entry.executor.id, data)) {
        await logExempt(guild, "ban", entry.executor.tag, `\`${user.tag}\` adlı üyeyi banladı`);
        return;
      }
      const limit = data.limits?.ban ?? 3;
      if (hit(`${guild.id}:ban:${entry.executor.id}`, 60000) < limit) return;
      const res = await punish(guild, entry.executor.id, g.punish, `Limit üstü ban (${limit}/dk)`);
      const restored = await guild.members.unban(user.id, "Guard: limit üstü ban geri alındı").then(() => "Başarılı").catch(() => "Başarısız");
      await sendLog(guild, "ban", new EmbedBuilder().setColor(Colors.Red)
        .setTitle("🚫 Ban Koruma").setDescription(`**${entry.executor.tag}** limit üstü ban attı.`)
        .addFields(
          { name: "Banlanan", value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: "Ceza", value: `\`${res}\``, inline: true }
          , { name: "Hedefin banını kaldırma", value: restored }
        ).setTimestamp());
    } catch (err) { log.error(`[banGuard] ${err.message}`); }
  },
};
