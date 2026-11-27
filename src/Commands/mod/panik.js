import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import { raidMode, settings } from "../../Utils/guard.js";
import { duration, recordCase, report } from "../../Utils/command.js";
export const commandBase = {
  name: "panik", aliases: ["panic", "beast"], description: "Süreli katılım engeli açar, kapatır ve kalan süreyi gösterir.", perms: PermissionsBitField.Flags.Administrator, cooldown: 5,
  async run(client, message, args) {
    const sub = args[0] ?? "durum";
    if (["durum","status","info"].includes(sub)) {
      const data = await settings(message.guild.id);
      return report(message, "Panik modu", [["Durum", data.raidUntil > new Date() ? "Aktif • <t:" + Math.floor(data.raidUntil.getTime() / 1000) + ":R> biter" : "Kapalı"]]);
    }
    if (["kapat","close","disable","off"].includes(sub)) {
      await raidMode.off(message.guild.id);
      await recordCase(message, "panic-off", message.guild.id, "Manuel kapatma");
      return message.reply("🔓 Panik modu kapatıldı.");
    }
    if (sub !== "aç") throw new UserInputError("Kullanım: panik aç [10m] | kapat | durum");
    const ms = duration(args[1] ?? "10m", 3600000);
    if (!ms || ms < 60000) throw new UserInputError("Panik süresi 1 dakika–1 saat arasında olmalı.");
    await raidMode.on(message.guild.id, ms);
    await recordCase(message, "panic-on", message.guild.id, "Manuel açma", { durationMs: ms });
    return report(message, "Panik modu açıldı", [["Süre", ms / 60000 + " dakika"], ["Davranış", "Muaf olmayan yeni katılımlar atılır. guard1 veya all botunun çalışması gerekir."]]);
  },
};
