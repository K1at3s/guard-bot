import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import { resolveMember, assertTarget, reasonText, auditReason, recordCase, report, snowflake } from "../../Utils/command.js";
import { t, localeFromContext } from "../../Utils/i18n.js";
export const commandBase = {
  name: "ban", aliases: ["yasakla"], description: "Üyeyi veya ID'yi banlar; isteğe bağlı son 7 güne kadar mesajlarını siler.", perms: PermissionsBitField.Flags.BanMembers, cooldown: 3,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const locale = localeFromContext(message);
    const targetId = snowflake(args[0]);
    if (!targetId) throw new UserInputError(isTurkish ? "Geçerli bir üye etiketi veya ID girin." : "Enter a valid member mention or ID.");
    const member = await resolveMember(message.guild, args[0]);
    const options = args.filter((arg) => arg.startsWith("--sil="));
    const days = options.length ? Number(options[0].slice(6)) : 0;
    if (options.length > 1 || !Number.isInteger(days) || days < 0 || days > 7) throw new UserInputError(isTurkish ? "--sil değeri 0–7 arasında bir tam sayı olmalı." : "--sil value must be an integer between 0-7.");
    const reason = reasonText(args.slice(1).filter((arg) => !arg.startsWith("--sil=")));

    if (member) {
      assertTarget(message, member, "bannable");
      await member.ban({ reason: auditReason(message, reason), deleteMessageSeconds: days * 86400 });
      const id = await recordCase(message, "ban", member.id, reason, { deletedDays: days });
      return report(message, t(locale, "ban.done"), [[t(locale,"ban.member"), member.user.tag], ["ID", member.id], [t(locale,"ban.reason"), reason], [t(locale,"ban.delete"), t(locale,"ban.days",{days})], [t(locale,"ban.record"), id]]);
    }

    if ([message.author.id, message.client.user.id, message.guild.ownerId].includes(targetId)) {
      throw new UserInputError(isTurkish ? "Kendinize, sunucu sahibine veya bu bota işlem yapamazsınız." : "You cannot take action on yourself, the server owner, or this bot.");
    }
    const existing = await message.guild.bans.fetch(targetId).catch(() => null);
    if (existing) throw new UserInputError(isTurkish ? "Bu kullanıcı zaten yasaklı." : "This user is already banned.");

    await message.guild.members.ban(targetId, { reason: auditReason(message, reason), deleteMessageSeconds: days * 86400 });
    const user = await client.users.fetch(targetId).catch(() => null);
    const tag = user?.tag ?? targetId;
    const id = await recordCase(message, "ban", targetId, reason, { deletedDays: days, byId: true });
    return report(message, t(locale, "ban.done"), [[t(locale,"ban.user"), tag], ["ID", targetId], [t(locale,"ban.reason"), reason], [t(locale,"ban.delete"), t(locale,"ban.days",{days})], [t(locale,"ban.record"), id]]);
  },
};