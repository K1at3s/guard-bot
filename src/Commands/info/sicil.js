import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import Case from "../../Database/schemas/Case.js";
import { snowflake, report } from "../../Utils/command.js";
export const commandBase = {
  name: "sicil", aliases: ["history"], description: "Üyenin kayıtlı moderasyon geçmişini sayfalı gösterir.", perms: PermissionsBitField.Flags.ModerateMembers, cooldown: 5,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const targetId = snowflake(args[0]);
    if (!targetId) throw new UserInputError(isTurkish ? "Geçerli kullanıcı ID'si girin." : "Enter a valid user ID.");
    const filter = { guildId: message.guild.id, targetId };
    const total = await Case.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / 8));
    const page = Number(args[1] ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > pages) throw new UserInputError("Sayfa 1–" + pages + " arasında olmalı.");
    const rows = await Case.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 8).limit(8).lean();
    return report(message, "İşlem geçmişi • " + page + "/" + pages, [["Kullanıcı / toplam", targetId + " / " + total], ["İşlemler", rows.map((r) => r.action + " • " + r.moderatorId + " • " + (r.reason ?? "—").slice(0, 60) + " • " + r._id).join("\n") || isTurkish ? "Kayıt yok" : "No records"]]);
  },
};
