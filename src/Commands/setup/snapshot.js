import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import Snapshot from "../../Database/schemas/Snapshot.js";
import config from "../../Base/config.js";
import { takeSnapshot, restoreGuild, snapshotPlan, MAX_SNAP } from "../../Utils/snapshot.js";
import { report, recordCase } from "../../Utils/command.js";

export const commandBase = {
  name: "snapshot",
  aliases: ["yedek"],
  description: "Sunucu yapısını yedekler / geri yükler.",
  perms: PermissionsBitField.Flags.Administrator,
  cooldown: 10,
  async run(client, message, args) {
    const [sub, no] = args;
    const log = client.logger;

    if (sub === "liste" || sub === "list") {
      const snaps = await Snapshot.find({ guildId: message.guild.id }).sort({ createdAt: -1 });
      if (!snaps.length) return message.channel.send("📭 Yedek yok. `.snapshot al` ile oluşturun (otomatik bot da periyodik alır).");
      return message.channel.send("📸 **Yedekler:**\n" + snaps.map((s, i) =>
        `\`${i + 1}.\` <t:${Math.floor(s.createdAt.getTime() / 1000)}:F> — ${s.roles.length} rol, ${s.channels.length} kanal (alan: ${s.createdBy})`).join("\n")
        + "\n\nYüklemek için: `.snapshot yükle <sıra>` (sadece sahipler).");
    }

    if (sub === "yükle" || sub === "incele") {
      const index = Number(no ?? 1);
      if (!Number.isInteger(index) || index < 1 || index > MAX_SNAP) throw new UserInputError("Yedek sırası 1–3 arasında olmalı.");
      const snaps = await Snapshot.find({ guildId: message.guild.id }).sort({ createdAt: -1 });
      const snap = snaps[index - 1];
      if (!snap) throw new UserInputError("Yedek bulunamadı.");
      if (sub === "incele" || args[2] !== "ONAY") {
        await Promise.all([message.guild.roles.fetch(), message.guild.channels.fetch()]);
        const plan = snapshotPlan(message.guild, snap);
        return report(message, "Yedek geri yükleme önizlemesi", [["Oluşturulacak", `${plan.roles.length} rol • ${plan.channels.length} kanal`], ["Mevcut", `${snap.roles.length - plan.roles.length} rol • ${snap.channels.length - plan.channels.length} kanal`], ["Uygulama", `snapshot yükle ${index} ONAY — yalnız eksik yapılar oluşturulur; üye yetkileri otomatik geri verilmez.`]]);
      }
      if (!config.owners.includes(message.author.id)) return message.channel.send("❌ Yükleme sadece bot sahiplerine açık.");
      const status = await message.channel.send(`⏳ Geri yükleme başladı (${snap.roles.length} rol, ${snap.channels.length} kanal)...`);
      try {
        const res = await restoreGuild(message.guild, snap, log);
        await recordCase(message, "snapshot-restore", message.guild.id, `Yedek ${index}`, res);
        return status.edit(`Geri yükleme tamamlandı.\n• Roller: ${res.roles} açıldı, ${res.rolesRe} mevcut kullanıldı\n• Kanallar: ${res.channels} açıldı, ${res.channelsRe} mevcut kullanıldı\n• Başarısız adım: ${res.failed}${res.errors.length ? "\n" + res.errors.slice(0, 10).join("\n") : ""}`);
      } catch (err) {
        log.error(`[Snapshot] yükleme hatası: ${err.message}`);
        return status.edit("❌ Yükleme sırasında hata oluştu, kısmi tamamlanmış olabilir.");
      }
    }

    if (sub !== "al") return message.channel.send("❌ Kullanım: `.snapshot al | liste | yükle <sıra>`");
    const res = await takeSnapshot(message.guild, message.author.tag, log);
    return message.channel.send(`📸 Yedek alındı: **${res.roles}** rol, **${res.channels}** kanal. (en fazla ${MAX_SNAP} yedek tutulur)`);
  },
};
