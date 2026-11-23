import { Events, EmbedBuilder, Colors, AuditLogEvent } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, hit, logExempt, claimAudit } from "../Utils/guard.js";

export default {
  name: Events.GuildMemberRemove,
  roles: ["guard1"],
  async execute(member) {
    const { guild } = member;
    const log = guild.client.logger;
    try {
      const data = await settings(guild.id);
      const g = data.guards.kick;
      if (!g?.enabled) return;
      // Ban'lar da Remove üretir — sadece gerçek kick kaydı varsa devam
      const entry = await auditEntry(guild, AuditLogEvent.MemberKick, member.id);
      if (!entry?.executor || !claimAudit(guild.id, entry, "kickGuard")) return;
      if (isExempt(guild, entry.executor.id, data)) {
        await logExempt(guild, "kick", entry.executor.tag, `\`${member.user.tag}\` adlı üyeyi attı`);
        return;
      }
      const limit = data.limits?.kick ?? 3;
      if (hit(`${guild.id}:kick:${entry.executor.id}`, 60000) < limit) return;
      const res = await punish(guild, entry.executor.id, g.punish, `Limit üstü kick (${limit}/dk)`);
      await sendLog(guild, "kick", new EmbedBuilder().setColor(Colors.Red)
        .setTitle("👢 Kick Koruma").setDescription(`**${entry.executor.tag}** limit üstü kick attı.`)
        .addFields(
          { name: "Atılan", value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
          { name: "Ceza", value: `\`${res}\``, inline: true }
        ).setTimestamp());
    } catch (err) { log.error(`[kickGuard] ${err.message}`); }
  },
};
