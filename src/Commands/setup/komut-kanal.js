import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { settings } from "../../Utils/guard.js";
import { snowflake, paginate, report, recordCase } from "../../Utils/command.js";
export const commandBase = {
  name: "komut-kanal", aliases: ["komutkanal"], description: "Komut kanallarını listeler, ekler, çıkarır ve engeller.", perms: PermissionsBitField.Flags.ManageGuild, cooldown: 3,
  async run(client, message, args) {
    const sub = args[0] ?? "liste";
    const guildId = message.guild.id;
    if (sub === "liste" || sub === "list") {
      const data = await settings(guildId);
      const rows = [...data.commandChannels.map((id) => "İzinli: " + id), ...data.disabledChannels.map((id) => "Engelli: " + id)];
      const page = paginate(rows, args[1]);
      return report(message, "Komut kanalları • " + page.page + "/" + page.pages, [["Mod", data.commandChannels.length ? "Yalnız izinli kanallar" : "Engelli kanallar dışında her yer"], ["Liste", page.items.join("\n") || "Kısıtlama yok"]]);
    }
    if (sub === "her-yer" || sub === "everywhere") {
      await Guild.updateOne({ guildId }, { $set: { commandChannels: [] } });
      return message.reply("✅ İzinli kanal kısıtlaması kaldırıldı; engelli kanallar korunuyor.");
    }
    const id = args[1] ? snowflake(args[1]) : message.channel.id;
    const channel = message.guild.channels.cache.get(id);
    if (!channel?.isTextBased()) throw new UserInputError("Geçerli yazı kanalı seçin.");
    const updates = {
      sadece: { $addToSet: { commandChannels: id }, $pull: { disabledChannels: id } },
      çıkar: { $pull: { commandChannels: id } },
      aç: { $pull: { disabledChannels: id } },
      kapat: { $addToSet: { disabledChannels: id } },
    };
    if (!action) throw new UserInputError("Kullanım: komut-kanal liste/list|sadece/only|çıkar/remove|aç/open|kapat/close|her-yer/everywhere [#kanal]");
    await Guild.updateOne({ guildId }, updates[action], { upsert: true });
    await recordCase(message, "command-channel", id, action);
    return message.reply("✅ " + channel.name + " için komut ayarı: " + action);
  },
};
