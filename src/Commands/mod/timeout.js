import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import { resolveMember, assertTarget, duration, reasonText, auditReason, recordCase, report } from "../../Utils/command.js";
export const commandBase = {
  name: "timeout", aliases: ["sustur", "mute"], description: "Susturma uygular, kaldırır veya kalan süreyi gösterir; en fazla 28 gün.", perms: PermissionsBitField.Flags.ModerateMembers, cooldown: 3,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const member = await resolveMember(message.guild, args[0]);
    if (!member) throw new UserInputError(isTurkish ? "Geçerli bir üye etiketi veya ID girin." : "Enter a valid member mention or ID.");
    if (args[1] === "durum") return report(message, isTurkish ? "Susturma durumu" : "Timeout status", [[isTurkish?"Üye":"Member", member.user.tag], [isTurkish?"Bitiş":"Ends", member.communicationDisabledUntilTimestamp > Date.now() ? "<t:" + Math.floor(member.communicationDisabledUntilTimestamp / 1000) + ":R>" : (isTurkish?"Aktif susturma yok":"No active timeout")]]);
    assertTarget(message, member, "moderatable");
    const remove = ["kaldır", "kaldir", "kapat"].includes(args[1]);
    const ms = remove ? null : duration(args[1]);
    if (!remove && !ms) throw new UserInputError(isTurkish ? "Süre 1s–28d arasında olmalı. Örnek: 1h30m. Kaldırmak için: timeout @üye kaldır" : "Duration must be 1s–28d. Example: 1h30m. To remove: timeout @user remove");
    const reason = reasonText(args.slice(2));
    await member.timeout(ms, auditReason(message, reason));
    const id = await recordCase(message, remove ? "untimeout" : "timeout", member.id, reason, { durationMs: ms });
    return report(message, remove ? (isTurkish?"Susturma kaldırıldı":"Timeout removed") : (isTurkish?"Susturma uygulandı":"Timeout applied"), [[isTurkish?"Üye":"Member", member.user.tag], [isTurkish?"Süre":"Duration", remove ? (isTurkish?"Kaldırıldı":"Removed") : ms / 60000 + " " + (isTurkish?"dakika":"minutes")], [isTurkish?"Sebep":"Reason", reason], [isTurkish?"Kayıt":"Record", id]]);
  },
};
