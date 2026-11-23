import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField, Colors } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { settings } from "../../Utils/guard.js";
import { resolveMember, assertTarget, snowflake, reasonText, auditReason, recordCase, report, paginate } from "../../Utils/command.js";
export const commandBase = {
  name: "uyar", aliases: ["warn", "uyarılar"], description: "Uyarı verir; üye/sunucu listesi, tek kayıt silme ve temizleme sunar.", perms: PermissionsBitField.Flags.ModerateMembers, cooldown: 3,
  async run(client, message, args) {
    const guildId = message.guild.id;
    if (!args.length || args[0] === "liste") {
      const data = await settings(guildId, { includeWarnings: true });
      const targetId = snowflake(args[1]);
      if (args[1] && !targetId && !/^\d{1,4}$/.test(args[1])) throw new UserInputError("Geçerli üye ID'si veya sayfa girin.");
      const list = [...(data.warns ?? [])].filter((w) => !targetId || w.userId === targetId).reverse();
      const page = paginate(list, targetId ? args[2] : args[1]);
      return report(message, "Uyarılar • " + page.page + "/" + page.pages, [["Toplam", page.total], ["Kayıtlar", page.items.map((w) => w._id + " • " + w.userId + " • " + w.reason.slice(0, 60)).join("\n") || "Uyarı yok"]], Colors.Yellow);
    }
    if (args[0] === "sil") {
      if (!/^[a-f0-9]{24}$/i.test(args[1] ?? "")) throw new UserInputError("Geçerli uyarı kayıt ID'si girin.");
      const result = await Guild.updateOne({ guildId }, { $pull: { warns: { _id: args[1] } } });
      if (!result.modifiedCount) throw new UserInputError("Uyarı bulunamadı.");
      await recordCase(message, "warn-delete", args[1], "Uyarı silindi");
      return message.reply("✅ Uyarı silindi.");
    }
    if (args[0] === "temizle") {
      const targetId = snowflake(args[1]);
      if (!targetId) throw new UserInputError("Uyarıları temizlenecek kullanıcının ID'sini girin.");
      await Guild.updateOne({ guildId }, { $pull: { warns: { userId: targetId } } });
      await recordCase(message, "warn-clear", targetId, reasonText(args.slice(2)));
      return message.reply("✅ Üyenin aktif uyarıları temizlendi; işlem geçmişi saklandı.");
    }
    const member = await resolveMember(message.guild, args[0]);
    assertTarget(message, member, "moderatable");
    const reason = reasonText(args.slice(1));
    await Guild.updateOne({ guildId }, { $setOnInsert: { guildId } }, { upsert: true });
    const data = await Guild.findOneAndUpdate({ guildId, $expr: { $lt: [{ $size: { $ifNull: ["$warns", []] } }, 2000] } },
      { $push: { warns: { userId: member.id, modId: message.author.id, reason } } }, { new: true });
    if (!data) throw new UserInputError("Aktif uyarı sınırına (2000) ulaşıldı. Eski aktif uyarıları kontrollü temizleyin; sicil kayıtları korunur.");
    const count = data.warns.filter((w) => w.userId === member.id).length;
    const threshold = data.warningPolicy?.threshold ?? 3;
    let result = "Eşik altında";
    if (count % threshold === 0) {
      try { await member.timeout(data.warningPolicy?.timeoutMs ?? 1800000, auditReason(message, "Uyarı eşiği aşıldı")); result = "Susturma uygulandı"; }
      catch (err) { client.logger.error("[Uyarı susturma] " + err.message); result = "Uyarı kaydedildi; susturma BAŞARISIZ"; }
    }
    const id = await recordCase(message, "warn", member.id, reason, { count, result });
    return report(message, "Uyarı kaydedildi", [["Üye", member.user.tag], ["Aktif uyarılar / eşik", count + " / " + threshold], ["Sonuç", result], ["Kayıt", id]], Colors.Yellow);
  },
};
