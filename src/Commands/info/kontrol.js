import { EmbedBuilder, Colors, PermissionsBitField } from "discord.js";
import mongoose from "mongoose";
import { settings, GUARDS } from "../../Utils/guard.js";

export const commandBase = {
  name: "kontrol", aliases: ["diagnostic"], description: "Yetki, log, karantina ve veritabanı durumunu denetler.",
  perms: PermissionsBitField.Flags.ManageGuild, cooldown: 10,
  async run(client, message) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const data = await settings(message.guild.id);
    const me = await message.guild.members.fetchMe();
    const required = ["ViewAuditLog", "ManageRoles", "ManageChannels", "ManageWebhooks", "BanMembers", "KickMembers", "ModerateMembers"];
    const missing = required.filter((name) => !me.permissions.has(PermissionsBitField.Flags[name]));
    const role = message.guild.roles.cache.get(data.quarantineRole);
    const services = [...(data.services?.entries?.() ?? [])];
    const serviceText = services.map(([name, service]) => `${name}: ${Date.now() - service.lastSeen?.getTime() < 150000 ? "Son durum sinyali güncel" : "Durum sinyali eski"} (${service.userId})`).join("\n") || "Henüz durum sinyali yok";
    const highRoles = message.guild.roles.cache.filter((r) => r.id !== message.guild.id && !r.managed && r.permissions.bitfield !== 0n && r.comparePositionTo(me.roles.highest) >= 0);
    const problems = [];
    for (const [key, guard] of Object.entries(GUARDS)) {
      if (!data.guards[key]?.enabled) continue;
      const channel = message.guild.channels.cache.get(data.logs?.[key]);
      if (!channel?.isTextBased() || !channel.permissionsFor(me)?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
        problems.push(guard.name);
      }
    }
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(missing.length || problems.length ? Colors.Yellow : Colors.Green)
      .setTitle("Guard Bot • Güvenlik kontrolü").addFields(
        { name: "Görev / veritabanı", value: `${client.role} / ${mongoose.connection.readyState === 1 ? "Bağlı" : "Bağlı değil"}` },
        { name: "Eksik bot yetkileri", value: missing.join(", ") || "Eksik yok" },
        { name: "Log sorunu olan korumalar", value: problems.join(", ") || "Sorun yok" },
        { name: "Karantina rolü", value: role?.editable && !role.managed && role.permissions.bitfield === 0n ? "Yönetilebilir ve yetkisiz; kanal izinlerini ayrıca inceleyin." : "Ayarlanmamış veya uygun değil" },
        { name: "Panik modu", value: data.raidUntil > new Date() ? `<t:${Math.floor(data.raidUntil.getTime() / 1000)}:R> sona erer` : "Kapalı" },
        { name: "Bot durum sinyalleri", value: serviceText.slice(0, 1024) },
        { name: "Bu botun üstündeki yetki rolleri", value: highRoles.map((r) => r.name).join(", ").slice(0, 1024) || (isTurkish ? "Yok" : "None") },
        { name: "Muafiyetler", value: `${data.safelist.length} güvenli kullanıcı • ${data.guardBots.length} kayıtlı guard botu` },
      ).setFooter({ text: "Durum sinyali 60 saniyede yenilenir; anlık bağlantı garantisi değildir. Rol sırasını her bot için denetleyin." }).setTimestamp()] });
  },
};
