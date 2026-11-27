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
      if (sub === "liste" || sub === "list") {
        const page = paginate(data.safelist, raw, 15);
        const items = page.items.map((uid) => `<@${uid}> (\`${uid}\`)`);
        return report(message, `${isTurkish ? "Güvenli liste" : "Safelist"} • ${page.page}/${page.pages}`, [[isTurkish?"Toplam":"Total", page.total], [isTurkish?"Üyeler":"Members", items.join("\n") || (isTurkish?"Liste boş":"List is empty")]]);
      }
      const id = snowflake(raw);
      if (!id) throw new UserInputError(isTurkish ? "Geçerli kullanıcı etiketi veya ID girin." : "Enter a valid user mention or ID.");
      if (sub === "kontrol" || sub === "check") return report(message, isTurkish ? "Muafiyet kontrolü" : "Exemption check", [[isTurkish?"Kullanıcı":"User", id], [isTurkish?"Guard muafiyeti":"Guard exemption", isExempt(message.guild, id, data) ? (isTurkish?"Var":"Yes") : (isTurkish?"Yok":"No")], [isTurkish?"Safelist kaydı":"Safelist entry", data.safelist.includes(id) ? (isTurkish?"Var":"Yes") : (isTurkish?"Yok":"No")]]);
      if (!["ekle","add","kaldır","kaldir","remove"].includes(sub)) throw new UserInputError(isTurkish ? "Kullanım: safelist ekle|kaldır|kontrol <ID> veya safelist liste [sayfa]" : "Usage: safelist add|remove|check <ID> or safelist list [page]");
      if ((sub === "ekle" || sub === "add") && data.safelist.length >= 200 && !data.safelist.includes(id)) throw new UserInputError(isTurkish ? "Güvenli liste en fazla 200 kullanıcı içerebilir." : "Safelist can contain at most 200 users.");
      await updateSafelist(message.guild.id, [id], ["ekle","add"].includes(sub));
      await recordCase(message, "safelist", id, ["ekle","add"].includes(sub) ? "ekle" : "kaldır");
      return message.reply(isTurkish ? `✅ ${id}: güvenli liste ${sub} işlemi tamamlandı.` : `✅ ${id}: safelist ${["ekle","add"].includes(sub) ? "add" : "remove"} completed.`);
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
