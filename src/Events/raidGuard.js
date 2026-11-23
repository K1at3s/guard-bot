import { Events, EmbedBuilder, Colors } from "discord.js";
import { settings, sendLog, hit, raidMode, isExempt } from "../Utils/guard.js";

export default {
  name: Events.GuildMemberAdd,
  roles: ["guard1"],
  async execute(member) {
    const { guild } = member;
    const log = guild.client.logger;
    try {
      const data = await settings(guild.id);
      if (isExempt(guild, member.id, data)) return;
      if (member.user.bot) return;
      const active = await raidMode.active(guild.id);
      if (!data.guards.raid?.enabled && !active) return;
      const policy = data.raidPolicy;
      if (active) {
        // Raid modu aktif: gireni bekletmeden at (sahip hariç)
        if (member.id === guild.ownerId) return;
        await member.kick("Raid modu aktif.");
        log.warn(`[raidGuard] Raid modu: ${member.user.tag} atıldı.`);
        return;
      }
      if (policy?.minAccountAgeHours > 0 && Date.now() - member.user.createdTimestamp < policy.minAccountAgeHours * 3600000) {
        await member.kick("Guard: hesap yaşı raid politikasının altında");
        await sendLog(guild, "raid", new EmbedBuilder().setColor(Colors.Yellow).setTitle("Yeni Hesap Koruma")
          .setDescription(`${member.user.tag} • Hesap yaşı ${policy.minAccountAgeHours} saat eşiğinin altında; atıldı.`).setTimestamp());
        return;
      }
      const limit = data.limits?.joins ?? 5;
      if (hit(`${guild.id}:joins`, policy?.windowMs ?? 10000) >= limit) {
        const durationMs = policy?.durationMs ?? 300000;
        await raidMode.on(guild.id, durationMs);
        const kicked = await member.kick("Raid katılım limiti aşıldı.").then(() => "Başarılı").catch(() => "Başarısız");
        await sendLog(guild, "raid", new EmbedBuilder().setColor(Colors.Red)
          .setTitle("🚨 Raid Tespiti").setDescription(`${(policy?.windowMs ?? 10000) / 1000} sn içinde **${limit}+** katılım! ${durationMs / 60000} dk katılım engeli.`)
          .addFields({ name: "Eşiği tetikleyen üyeyi çıkarma", value: kicked })
          .setTimestamp());
        log.warn(`[raidGuard] ${guild.name}: raid modu açıldı.`);
      }
    } catch (err) { log.error(`[raidGuard] ${err.message}`); }
  },
};
