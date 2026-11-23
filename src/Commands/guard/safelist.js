import { UserInputError } from "../../Utils/errors.js";
import {
  MessageFlags, TextDisplayBuilder, ButtonBuilder, ButtonStyle,
  ContainerBuilder, SeparatorBuilder, ActionRowBuilder, PermissionsBitField,
} from "discord.js";
import config from "../../Base/config.js";
import Guild from "../../Database/schemas/Guild.js";
import { settings, isExempt } from "../../Utils/guard.js";
import { snowflake, paginate, report, recordCase } from "../../Utils/command.js";
import { updateSafelist } from "../../Utils/safelist.js";

function panel(isTurkish) {
  return new ContainerBuilder()
    .setAccentColor(0x0099FF)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(isTurkish
          ? "Aşağıdaki butonları kullanarak kullanıcıları yönetebilirsin:"
          : "You can manage users using the buttons below:")
    )
    .addSeparatorComponents(separator => separator)
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("kullanici_ekle")
          .setLabel(isTurkish ? "➕ Ekle" : "➕ Add")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("kullanici_kaldir")
          .setLabel(isTurkish ? "➖ Kaldır" : "➖ Remove")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("listele")
          .setLabel(isTurkish ? "📄 Listele" : "📄 List")
          .setStyle(ButtonStyle.Secondary)
      )
    );
}

export const commandBase = {
  name: "güvenli-liste",
  aliases: ["güvenliliste", "safelist"],
  description: "Güvenli listeyi butonlu panel ile yönetir (sadece sahipler).",
  ownerOnly: true,
  perms: PermissionsBitField.Flags.Administrator,
  cooldown: 5,
  async run(client, message, args) {
    if (args.length) {
      const [sub, raw] = args;
      const data = await settings(message.guild.id);
      if (sub === "liste") {
        const page = paginate(data.safelist, raw, 15);
        return report(message, `Güvenli liste • ${page.page}/${page.pages}`, [["Toplam", page.total], ["Üyeler", page.items.join("\n") || "Liste boş"]]);
      }
      const id = snowflake(raw);
      if (!id) throw new UserInputError("Geçerli kullanıcı etiketi veya ID girin.");
      if (sub === "kontrol") return report(message, "Muafiyet kontrolü", [["Kullanıcı", id], ["Guard muafiyeti", isExempt(message.guild, id, data) ? "Var" : "Yok"], ["Safelist kaydı", data.safelist.includes(id) ? "Var" : "Yok"]]);
      if (!["ekle", "kaldır"].includes(sub)) throw new UserInputError("Kullanım: safelist ekle|kaldır|kontrol <ID> veya safelist liste [sayfa]");
      if (sub === "ekle" && data.safelist.length >= 200 && !data.safelist.includes(id)) throw new UserInputError("Güvenli liste en fazla 200 kullanıcı içerebilir.");
      await updateSafelist(message.guild.id, [id], sub === "ekle");
      await recordCase(message, "safelist", id, sub);
      return message.reply(`✅ ${id}: güvenli liste ${sub} işlemi tamamlandı.`);
    }
    const isTurkish = message.guild.preferredLocale?.startsWith("tr");
    if (!config.owners.includes(message.author.id)) {
      return message.reply(isTurkish ? "❌ Bu komutu sadece bot sahipleri kullanabilir." : "❌ Only bot owners can use this command.");
    }
    await message.reply({
      components: [panel(isTurkish)],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
