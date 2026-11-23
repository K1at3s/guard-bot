import { Events, EmbedBuilder, Colors, AuditLogEvent } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, hit, logExempt, claimAudit, attempt, FRESH_MS } from "../Utils/guard.js";
import { matchesChanges, freshAudit } from "../Utils/audit.js";
export default {
  name: [Events.GuildUpdate, Events.GuildAuditLogEntryCreate, Events.InviteCreate, Events.InviteDelete], roles: ["guard3"],
  async execute(a, b) {
    if (this.eventName === Events.GuildAuditLogEntryCreate || a?.action !== undefined) {
      if (a.action !== AuditLogEvent.MemberPrune || !b?.id || !a.executor || !freshAudit(a)) return;
      const guild = b;
      const data = await settings(guild.id);
      if (!data.guards.server.enabled || !claimAudit(guild.id, a, "server-prune")) return;
      if (isExempt(guild, a.executor.id, data)) return logExempt(guild, "server", a.executor.tag, "üye budaması başlattı");
      const result = await punish(guild, a.executor.id, data.guards.server.punish, "İzinsiz üye budama");
      return sendLog(guild, "server", new EmbedBuilder().setColor(Colors.Red).setTitle("Üye Budama Koruma")
        .setDescription(a.executor.tag + " üye budaması başlattı. Atılan üyeler otomatik geri getirilemez.").addFields({ name: "Ceza", value: result }).setTimestamp());
    }
    if (a?.code && a.guild) {
      const guild = a.guild;
      const data = await settings(guild.id);
      if (!data.guards.server.enabled) return;
      const type = this.eventName === Events.InviteDelete ? AuditLogEvent.InviteDelete : AuditLogEvent.InviteCreate;
      const entry = await auditEntry(guild, type, a.code);
      if (!entry?.executor || !claimAudit(guild.id, entry, "server-invite")) return;
      if (isExempt(guild, entry.executor.id, data)) return logExempt(guild, "server", entry.executor.tag, "davet işlemi yaptı");
      if (hit(guild.id + ":invite:" + entry.executor.id, 60000) < 5) return;
      const result = await punish(guild, entry.executor.id, data.guards.server.punish, "Davet işlem limiti aşıldı");
      const recovery = type === AuditLogEvent.InviteCreate ? await attempt(guild, "Davet silme", () => a.delete("Guard: davet limiti")) : "Silinen davet geri oluşturulamaz";
      return sendLog(guild, "server", new EmbedBuilder().setColor(Colors.Red).setTitle("Davet Koruma").setDescription(entry.executor.tag)
        .addFields({ name: "Ceza", value: result }, { name: "Müdahale", value: recovery }).setTimestamp());
    }
    if (!a?.id || !b?.id) return;
    const guild = b;
    const data = await settings(guild.id);
    if (!data.guards.server.enabled) return;
    const fields = ["name", "verificationLevel", "explicitContentFilter", "defaultMessageNotifications", "afkTimeout", "afkChannelId", "systemChannelId", "rulesChannelId", "publicUpdatesChannelId", "preferredLocale", "description"];
    const changed = fields.filter((key) => a[key] !== b[key]);
    if (a.icon !== b.icon) changed.push("icon");
    if (a.banner !== b.banner) changed.push("banner");
    if (a.vanityURLCode !== b.vanityURLCode) changed.push("vanityURLCode");
    if (!changed.length) return;
    const entry = await auditEntry(guild, AuditLogEvent.GuildUpdate, guild.id, 10, (entry) => matchesChanges(entry, a, b, {
      name: "name", verification_level: "verificationLevel", explicit_content_filter: "explicitContentFilter",
      default_message_notifications: "defaultMessageNotifications", afk_timeout: "afkTimeout", afk_channel_id: "afkChannelId",
      system_channel_id: "systemChannelId", rules_channel_id: "rulesChannelId", public_updates_channel_id: "publicUpdatesChannelId",
      preferred_locale: "preferredLocale", description: "description", icon_hash: "icon", banner_hash: "banner", vanity_url_code: "vanityURLCode",
    }));
    if (!entry?.executor || !claimAudit(guild.id, entry, "server-update")) return;
    if (isExempt(guild, entry.executor.id, data)) return logExempt(guild, "server", entry.executor.tag, "sunucu ayarlarını değiştirdi");
    const result = await punish(guild, entry.executor.id, data.guards.server.punish, "Sunucu ayarları değiştirildi");
    const optionNames = { afkChannelId: "afkChannel", systemChannelId: "systemChannel", rulesChannelId: "rulesChannel", publicUpdatesChannelId: "publicUpdatesChannel" };
    const patch = Object.fromEntries(changed.filter((key) => fields.includes(key)).map((key) => [optionNames[key] ?? key, a[key]]));
    if (changed.includes("icon")) patch.icon = a.iconURL({ extension: a.icon?.startsWith("a_") ? "gif" : "png", size: 1024 });
    if (changed.includes("banner")) patch.banner = a.bannerURL({ extension: a.banner?.startsWith("a_") ? "gif" : "png", size: 1024 });
    const recovery = Object.keys(patch).length ? await attempt(guild, "Sunucu geri alma", () => guild.edit({ ...patch, reason: "Guard: sunucu ayarları geri alındı" })) : "Geri alınabilecek standart ayar yok";
    return sendLog(guild, "server", new EmbedBuilder().setColor(Colors.Red).setTitle("Sunucu Koruma").setDescription(entry.executor.tag)
      .addFields({ name: "Değişen ayarlar", value: changed.join(", ") }, { name: "Ceza", value: result }, { name: "Geri alma", value: recovery },
        ...(changed.includes("vanityURLCode") ? [{ name: "Özel davet", value: "Özel davet adresi otomatik geri alınmadı; sunucu sahibi kontrol etmeli." }] : [])).setTimestamp());
  },
};
