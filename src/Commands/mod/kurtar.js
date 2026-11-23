import { UserInputError } from "../../Utils/errors.js";
import { report, paginate, recordCase } from "../../Utils/command.js";
const running = new Set();
export const commandBase = {
  name: "kurtar", aliases: ["recovery"], description: "Banları önce listeler; açık onayla sınırlı sayıda kaldırır.", ownerOnly: true, cooldown: 10,
  async run(client, message, args) {
    if (running.has(message.guild.id)) throw new UserInputError("Bu sunucuda kurtarma zaten çalışıyor.");
    const bans = await message.guild.bans.fetch();
    if (args[0] !== "uygula") {
      const page = paginate([...bans.values()], args[0] === "liste" ? args[1] : "1", 8);
      return report(message, "Ban kurtarma önizlemesi • " + page.page + "/" + page.pages, [["Toplam ban", bans.size], ["Liste", page.items.map((b) => b.user.id + " • " + b.user.tag + " • " + (b.reason || "Sebep yok").slice(0, 60)).join("\n") || "Ban yok"], ["Uygulama", "kurtar uygula ONAY [1..100] — en eski Discord liste sırasındaki ilk kayıtlar kaldırılır"]]);
    }
    const limit = Number(args[2] ?? 25);
    if (args[1] !== "ONAY" || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new UserInputError("Kullanım: kurtar uygula ONAY <1..100>");
    running.add(message.guild.id);
    let success = 0;
    const failed = [];
    const targets = [...bans.keys()].slice(0, limit);
    try {
      const status = await message.channel.send("⏳ " + targets.length + " ban için kurtarma başladı...");
      for (const id of targets) {
        try { await message.guild.members.unban(id, "Kurtarma | " + message.author.id); success++; }
        catch (err) { failed.push(id); client.logger.error("[Kurtar] " + id + ": " + err.message); }
      }
      await recordCase(message, "recovery", message.guild.id, "Toplu ban kurtarma", { success, failed });
      return status.edit("Kurtarma tamamlandı • Başarılı: " + success + " • Başarısız: " + failed.length + " • Kalan: " + (bans.size - success) + (failed.length ? "\nBaşarısız ID'ler: " + failed.slice(0, 20).join(", ") : ""));
    } finally { running.delete(message.guild.id); }
  },
};
