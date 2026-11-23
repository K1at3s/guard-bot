import { Events, EmbedBuilder, Colors, AuditLogEvent } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, hit, logExempt, claimAudit } from "../Utils/guard.js";

export default {
  name: Events.GuildMemberUpdate,
  roles: ["guard1"],
  async execute(oldMember, newMember) {
    if (oldMember.communicationDisabledUntilTimestamp === newMember.communicationDisabledUntilTimestamp
      || !newMember.communicationDisabledUntilTimestamp || newMember.communicationDisabledUntilTimestamp <= Date.now()) return;
    const guild = newMember.guild;
    const log = guild.client.logger;
    try {
      const data = await settings(guild.id);
      const g = data.guards.timeout;
      if (!g?.enabled) return;
      const entry = await auditEntry(guild, AuditLogEvent.MemberUpdate, newMember.id, 10,
        (entry) => entry.changes?.some((change) => change.key === "communication_disabled_until"
          && new Date(change.new).getTime() === newMember.communicationDisabledUntilTimestamp));
      if (!entry?.executor || !claimAudit(guild.id, entry, "timeoutGuard")) return;
      const timed = entry.changes?.some((c) => c.key === "communication_disabled_until" && c.new);
      if (!timed) return;
      if (isExempt(guild, entry.executor.id, data)) {
        await logExempt(guild, "timeout", entry.executor.tag, `\`${newMember.user.tag}\` adlı üyeyi susturdu`);
        return;
      }
      const limit = data.limits?.timeout ?? 4;
      if (hit(`${guild.id}:timeout:${entry.executor.id}`, 60000) < limit) return;
      const res = await punish(guild, entry.executor.id, g.punish, `Limit üstü susturma (${limit}/dk)`);
      const reverted = await newMember.timeout(null, "Guard: limit üstü susturma").then(() => "Başarılı").catch(() => "Başarısız");
      await sendLog(guild, "timeout", new EmbedBuilder().setColor(Colors.Red)
        .setTitle("⏱️ Timeout Koruma").setDescription(`**${entry.executor.tag}** limit üstü susturma attı.`)
        .addFields(
          { name: "Hedef", value: `${newMember.user.tag}`, inline: true },
          { name: "Ceza", value: `\`${res}\``, inline: true }
          , { name: "Hedef susturma kaldırma", value: reverted }
        ).setTimestamp());
    } catch (err) { log.error(`[timeoutGuard] ${err.message}`); }
  },
};
