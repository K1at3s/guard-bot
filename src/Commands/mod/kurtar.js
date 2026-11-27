import { UserInputError } from "../../Utils/errors.js";
import { report, paginate, recordCase } from "../../Utils/command.js";
const running = new Set();
export const commandBase = {
  name: "kurtar", aliases: ["recovery"], description: "Banları önce listeler; açık onayla sınırlı sayıda kaldırır.", ownerOnly: true, cooldown: 10,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    if (running.has(message.guild.id)) throw new UserInputError(isTurkish ? "Bu sunucuda kurtarma zaten çalışıyor." : "Recovery is already running in this server.");
    const bans = await message.guild.bans.fetch();
    if (!["uygula","apply"].includes(args[0])) {
      const page = paginate([...bans.values()], ["liste","list"].includes(args[0]) ? args[1] : "1", 8);
      return report(message, (isTurkish?"Ban kurtarma önizlemesi • ":"Ban recovery preview • ") + page.page + "/" + page.pages, [[isTurkish?"Toplam ban":"Total bans", bans.size], [isTurkish?"Liste":"List", page.items.map((b) => b.user.id + " • " + b.user.tag + " • " + (b.reason || (isTurkish?"Sebep yok":"No reason")).slice(0, 60)).join("\n") || (isTurkish?"Ban yok":"No bans")], [isTurkish?"Uygulama":"Apply", isTurkish ? "kurtar uygula ONAY [1..100] — en eski Discord liste sırasındaki ilk kayıtlar kaldırılır" : "recovery apply CONFIRM [1..100] — removes first bans in Discord list order"]]);
    }
    const limit = Number(args[2] ?? 25);
    if (args[1] !== "ONAY" || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new UserInputError(isTurkish ? "Kullanım: kurtar uygula ONAY <1..100>" : "Usage: recovery apply CONFIRM <1..100>");
    running.add(message.guild.id);
    let success = 0;
    const failed = [];
    const targets = [...bans.keys()].slice(0, limit);
    try {
      const status = await message.channel.send(isTurkish ? "⏳ " + targets.length + " ban için kurtarma başladı..." : "⏳ Recovery started for " + targets.length + " bans...");
      for (const id of targets) {
        try { await message.guild.members.unban(id, "Kurtarma | " + message.author.id); success++; }
        catch (err) { failed.push(id); client.logger.error("[Kurtar] " + id + ": " + err.message); }
      }
      await recordCase(message, "recovery", message.guild.id, "Toplu ban kurtarma", { success, failed });
      return status.edit((isTurkish ? "Kurtarma tamamlandı • Başarılı: " : "Recovery completed • Success: ") + success + (isTurkish ? " • Başarısız: " : " • Failed: ") + failed.length + (isTurkish ? " • Kalan: " : " • Remaining: ") + (bans.size - success) + (failed.length ? (isTurkish ? "\nBaşarısız ID'ler: " : "\nFailed IDs: ") + failed.slice(0, 20).join(", ") : ""));
    } finally { running.delete(message.guild.id); }
  },
};
