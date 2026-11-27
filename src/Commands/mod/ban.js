import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import { resolveMember, assertTarget, reasonText, auditReason, recordCase, report, snowflake } from "../../Utils/command.js";
export const commandBase = {
  name: "ban", aliases: ["yasakla"], description: "Üyeyi veya ID'yi banlar; isteğe bağlı son 7 güne kadar mesajlarını siler.", perms: PermissionsBitField.Flags.BanMembers, cooldown: 3,
  async run(client, message, args) {
    const targetId = snowflake(args[0]);
    if (!targetId) throw new UserInputError("Geçerli bir üye etiketi veya ID girin.");
    const member = await resolveMember(message.guild, args[0]);
    const options = args.filter((arg) => arg.startsWith("--sil="));
    const days = options.length ? Number(options[0].slice(6)) : 0;
    if (options.length > 1 || !Number.isInteger(days) || days < 0 || days > 7) throw new UserInputError("--sil değeri 0–7 arasında bir tam sayı olmalı.");
    const reason = reasonText(args.slice(1).filter((arg) => !arg.startsWith("--sil=")));

    if (member) {
      assertTarget(message, member, "bannable");
      await member.ban({ reason: auditReason(message, reason), deleteMessageSeconds: days * 86400 });
      const id = await recordCase(message, "ban", member.id, reason, { deletedDays: days });
      return report(message, "Ban uygulandı", [["Üye", member.user.tag], ["ID", member.id], ["Sebep", reason], ["Mesaj silme", days + " gün"], ["Kayıt", id]]);
    }

    if ([message.author.id, message.client.user.id, message.guild.ownerId].includes(targetId)) {
      throw new UserInputError("Kendinize, sunucu sahibine veya bu bota işlem yapamazsınız.");
    }
    const existing = await message.guild.bans.fetch(targetId).catch(() => null);
    if (existing) throw new UserInputError("Bu kullanıcı zaten yasaklı.");

    await message.guild.members.ban(targetId, { reason: auditReason(message, reason), deleteMessageSeconds: days * 86400 });
    const user = await client.users.fetch(targetId).catch(() => null);
    const tag = user?.tag ?? targetId;
    const id = await recordCase(message, "ban", targetId, reason, { deletedDays: days, byId: true });
    return report(message, "Ban uygulandı", [["Kullanıcı", tag], ["ID", targetId], ["Sebep", reason], ["Mesaj silme", days + " gün"], ["Kayıt", id]]);
  },
};