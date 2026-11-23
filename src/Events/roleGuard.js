import { Events, EmbedBuilder, Colors, AuditLogEvent, PermissionsBitField } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, logExempt, claimAudit, attempt } from "../Utils/guard.js";
import Snapshot from "../Database/schemas/Snapshot.js";
import { DANGEROUS_PERMISSIONS } from "../Utils/security.js";
import { matchesChanges } from "../Utils/audit.js";

export default {
  name: [Events.GuildRoleCreate, Events.GuildRoleDelete, Events.GuildRoleUpdate],
  roles: ["guard2"],
  async execute(oldRole, newRole) {
    const role = newRole ?? oldRole;
    const guild = role.guild;
    const log = guild.client.logger;
    try {
      const data = await settings(guild.id);
      const g = data.guards.role;
      if (!g?.enabled) return;

      if (role.managed) return;
      if (newRole) {
        const keys = ["name", "color", "hoist", "mentionable", "position"];
        const changed = keys.filter((key) => oldRole[key] !== newRole[key]);
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changed.push("permissions");
        if (!changed.length) return;
        const entry = await auditEntry(guild, AuditLogEvent.RoleUpdate, role.id, 10, (entry) => matchesChanges(entry, oldRole, newRole,
          { name: "name", color: "color", hoist: "hoist", mentionable: "mentionable", position: "position", permissions: "permissions" }));
        if (!entry?.executor || !claimAudit(guild.id, entry, "role-update")) return;
        if (isExempt(guild, entry.executor.id, data)) return logExempt(guild, "role", entry.executor.tag, "rol ayarlarını değiştirdi");
        const res = await punish(guild, entry.executor.id, g.punish, "İzinsiz rol değişikliği");
        const restored = await attempt(guild, "Rol ayarları geri alma", async () => {
          const patch = Object.fromEntries(["name", "color", "hoist", "mentionable", "permissions"]
            .filter((key) => entry.changes.some((change) => change.key === key)).map((key) => [key, oldRole[key]]));
          if (Object.keys(patch).length) await newRole.edit({ ...patch, reason: "Guard: rol ayarları geri alındı" });
          if (entry.changes.some((change) => change.key === "position")) await newRole.setPosition(oldRole.position);
        });
        await sendLog(guild, "role", new EmbedBuilder().setColor(Colors.Red).setTitle("Rol Koruma")
          .setDescription(entry.executor.tag + " • " + role.name)
          .addFields({ name: "Değişen ayarlar", value: changed.join(", ") }, { name: "Ceza", value: res }, { name: "Geri alma", value: restored }).setTimestamp());
        return;
      }

      // Silme: rolü geri oluştur + üyelere dağıt + cezalandır
      if (this.eventName === Events.GuildRoleDelete || !guild.roles.cache.has(role.id)) {
        const entry = await auditEntry(guild, AuditLogEvent.RoleDelete, role.id);
        if (!entry?.executor || !claimAudit(guild.id, entry, "roleGuard")) return;
        if (isExempt(guild, entry.executor.id, data)) {
          await logExempt(guild, "role", entry.executor.tag, `\`${role.name}\` rolünü sildi`);
          return;
        }
        // Silinmeden önce rolü olanlar: önce önbellek, boşsa son snapshot
        let holders = [...(role.members?.keys() ?? [])];
        if (!holders.length) {
          const snap = await Snapshot.findOne({ guildId: guild.id }).sort({ createdAt: -1 }).catch(() => null);
          const snapRole = snap?.roles.find((r) => r.oldId === role.id);
          if (snapRole?.members?.length) holders = [...snapRole.members];
        }
        const res = await punish(guild, entry.executor.id, g.punish, "Rol sildi");
        const requiresReview = role.permissions.any(DANGEROUS_PERMISSIONS);
        const created = await guild.roles.create({
          name: role.name, color: role.color, hoist: role.hoist,
          permissions: requiresReview ? [] : role.permissions, mentionable: role.mentionable,
          reason: "Guard: silinen rol geri açıldı.",
        }).catch(() => null);
        let dagitildi = 0;
        if (created) {
          const positionResult = await attempt(guild, "Rol sırası geri alma", () => created.setPosition(role.position));
          log.info(`[Rol geri alma] Sıra: ${positionResult}`);
          for (const userId of holders) {
            if (requiresReview) break;
            const m = await guild.members.fetch(userId).catch(() => null);
            if (!m || m.id === entry.executor.id || (data.quarantineRole && m.roles.cache.has(data.quarantineRole))) continue;
            const ok = await m.roles.add(created, "Guard: rol geri dağıtıldı.").then(() => true).catch(() => false);
            if (ok) dagitildi++;
            await new Promise((r) => setTimeout(r, 300)); // rate-limit dostu
          }
        }
        await sendLog(guild, "role", new EmbedBuilder().setColor(Colors.Red)
          .setTitle("🎭 Rol Koruma").setDescription(`**${entry.executor.tag}** \`${role.name}\` rolünü sildi.`)
          .addFields(
            { name: "Geri Açıldı", value: created ? "✅" : "❌", inline: true },
            { name: "Dağıtıldı", value: `\`${dagitildi}/${holders.length}\` üye`, inline: true },
            { name: "Yetki güvenliği", value: requiresReview ? "Tehlikeli izinler ve üye dağıtımı geri verilmedi; sahip incelemesi gerekli." : "Standart rol geri yüklendi." },
            { name: "Ceza", value: `\`${res}\``, inline: true }
          ).setTimestamp());
        return;
      }

      // Oluşturma: rolü sil + cezalandır
      const entry = await auditEntry(guild, AuditLogEvent.RoleCreate, role.id);
      if (!entry?.executor || !claimAudit(guild.id, entry, "roleGuard")) return;
      if (isExempt(guild, entry.executor.id, data)) {
        await logExempt(guild, "role", entry.executor.tag, `\`${role.name}\` rolünü oluşturdu`);
        return;
      }
      const removed = await attempt(guild, "İzinsiz rol silme", () => role.delete("Guard: izinsiz rol."));
      const res = await punish(guild, entry.executor.id, g.punish, "Rol oluşturdu");
      await sendLog(guild, "role", new EmbedBuilder().setColor(Colors.Red)
        .setTitle("🎭 Rol Koruma").setDescription(`**${entry.executor.tag}** izinsiz rol oluşturdu.`)
        .addFields({ name: "Ceza", value: `\`${res}\``, inline: true }, { name: "Rol silme", value: removed }).setTimestamp());
    } catch (err) { log.error(`[roleGuard] ${err.message}`); }
  },
};
