import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { settings } from "../../Utils/guard.js";
import { snowflake, paginate, report, recordCase } from "../../Utils/command.js";
export const commandBase = {
  name: "komut-kanal", aliases: ["komutkanal"], description: "Komut kanallarını listeler, ekler, çıkarır ve engeller.", perms: PermissionsBitField.Flags.ManageGuild, cooldown: 3,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const sub = args[0] ?? "liste";
    const guildId = message.guild.id;
    if (sub === "liste" || sub === "list") {
      const data = await settings(guildId);
      const rows = [...data.commandChannels.map((id) => "İzinli: " + id), ...data.disabledChannels.map((id) => "Engelli: " + id)];
      const page = paginate(rows, args[1]);
      return report(message, (isTurkish ? "Komut kanalları • " : "Command channels • ") + page.page + "/" + page.pages, [[isTurkish?"Mod":"Mode", data.commandChannels.length ? (isTurkish?"Yalnız izinli kanallar":"Allowed channels only") : (isTurkish?"Engelli kanallar dışında her yer":"Everywhere except disabled")], [isTurkish?"Liste":"List", page.items.join("\n") || (isTurkish?"Kısıtlama yok":"No restrictions")]]);
    }
    if (sub === "her-yer" || sub === "everywhere") {
      await Guild.updateOne({ guildId }, { $set: { commandChannels: [] } });
      return message.reply(isTurkish ? "✅ İzinli kanal kısıtlaması kaldırıldı; engelli kanallar korunuyor." : "✅ Allowed-channel restriction removed; disabled channels remain.");
    }
    const id = args[1] ? snowflake(args[1]) : message.channel.id;
    const channel = message.guild.channels.cache.get(id);
    if (!channel?.isTextBased()) throw new UserInputError(isTurkish ? "Geçerli yazı kanalı seçin." : "Select a valid text channel.");
    const updates = {
      sadece: { $addToSet: { commandChannels: id }, $pull: { disabledChannels: id } },
      çıkar: { $pull: { commandChannels: id } },
      aç: { $pull: { disabledChannels: id } },
      kapat: { $addToSet: { disabledChannels: id } },
    };
    if (!action) throw new UserInputError(isTurkish ? "Kullanım: komut-kanal liste|sadece|çıkar|aç|kapat|her-yer [#kanal]" : "Usage: command-channel list|only|remove|open|close|everywhere [#channel]");
    await Guild.updateOne({ guildId }, updates[action], { upsert: true });
    await recordCase(message, "command-channel", id, action);
    return message.reply(isTurkish ? "✅ " + channel.name + " için komut ayarı: " + action : "✅ Command setting for " + channel.name + ": " + action);
  },
};
