import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import { snowflake, reasonText, auditReason, recordCase, report } from "../../Utils/command.js";
export const commandBase = {
  name: "unban", aliases: ["unbanla"], description: "Mevcut ban kaydını doğrular ve gerekçeli olarak kaldırır.", perms: PermissionsBitField.Flags.BanMembers, cooldown: 3,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const targetId = snowflake(args[0]);
    if (!targetId) throw new UserInputError(isTurkish ? "Geçerli bir kullanıcı ID'si girin." : "Enter a valid user ID.");
    const ban = await message.guild.bans.fetch(targetId);
    const reason = reasonText(args.slice(1));
    await message.guild.members.unban(targetId, auditReason(message, reason));
    const id = await recordCase(message, "unban", targetId, reason, { previousReason: ban.reason });
    return report(message, isTurkish ? "Ban kaldırıldı" : "Ban removed", [[isTurkish?"Kullanıcı":"User", ban.user.tag], [isTurkish?"Önceki ban sebebi":"Previous ban reason", ban.reason || (isTurkish?"Belirtilmemiş":"Not specified")], [isTurkish?"Sebep":"Reason", reason], [isTurkish?"Kayıt":"Record", id]]);
  },
};
