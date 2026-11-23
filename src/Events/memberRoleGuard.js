import { Events, EmbedBuilder, Colors, AuditLogEvent, PermissionsBitField } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, logExempt, claimAudit } from "../Utils/guard.js";
import { DANGEROUS_PERMISSIONS } from "../Utils/security.js";

export default {
  name: Events.GuildMemberUpdate,
  roles: ["guard2"],
  async execute(oldMember, newMember) {
    const added = [...newMember.roles.cache.keys()].filter((id) => !oldMember.roles.cache.has(id));
    if (!added.length) return;
    const guild = newMember.guild;
    const log = guild.client.logger;
    try {
      const data = await settings(guild.id);
      const g = data.guards.role;
      if (!g?.enabled) return;
      // Auditten terfi eden rolleri bul (cache farkı güvenilmez olabilir)
      const entry = await auditEntry(guild, AuditLogEvent.MemberRoleUpdate, newMember.id, 10,
        (entry) => entry.changes?.some((change) => change.key === "$add" && change.new?.some((role) => added.includes(role.id))));
      if (!entry?.executor || !claimAudit(guild.id, entry, "memberRoleGuard")) return;
      if (isExempt(guild, entry.executor.id, data)) {
        await logExempt(guild, "role", entry.executor.tag, `${newMember.user.tag} adlı üyeye rol verdi`);
        return;
      }
      const addedIds = entry.changes?.find((c) => c.key === "$add")?.new?.map((r) => r.id) ?? [];
      if (!addedIds.length) return;
      const dangerous = addedIds
        .filter((id) => added.includes(id))
        .map((id) => guild.roles.cache.get(id))
        .filter((r) => r && r.permissions.any(DANGEROUS_PERMISSIONS));
      if (!dangerous.length) return;
      for (const r of dangerous) {
        await newMember.roles.remove(r, "Guard: izinsiz terfi geri alındı.");
      }
      const res = await punish(guild, entry.executor.id, g.punish, "Tehlikeli rol verdi");
      const permSummary = dangerous.map((r) => `\`${r.name}\`: ${(r.permissions.toArray().slice(0, 8).join(", ") || "—")}`).join("\n").slice(0, 1024);
      await sendLog(guild, "role", new EmbedBuilder().setColor(Colors.Red)
        .setTitle("🎭 Rol Koruma").setDescription(`**${entry.executor.tag}** ${newMember} adlı üyeye tehlikeli yetki rolü verdi, geri alındı.`)
        .addFields(
          { name: "Roller (izin özeti)", value: permSummary || "—" },
          { name: "Ceza", value: `\`${res}\``, inline: true }
        ).setTimestamp());
    } catch (err) { log.error(`[memberRoleGuard] ${err.message}`); }
  },
};
