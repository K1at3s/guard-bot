import { Events, UserSelectMenuBuilder, ActionRowBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, PermissionsBitField } from "discord.js";
import config from "../Base/config.js";
import { settings } from "../Utils/guard.js";
import { updateSafelist } from "../Utils/safelist.js";
const IDS = new Set(["kullanici_ekle", "kullanici_kaldir", "listele", "userSelect", "userRemoveFromSafeList"]);
const textPanel = (text) => new ContainerBuilder().setAccentColor(0x0099ff).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
export default {
  name: Events.InteractionCreate, roles: ["guard3"],
  async execute(interaction) {
    if (!interaction.guildId || !IDS.has(interaction.customId)) return;
    if (!config.owners.includes(interaction.user.id) || !interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Panel bot sahibi ve sunucu yöneticisi yetkisi gerektirir.", flags: MessageFlags.Ephemeral });
    }
    const selection = interaction.isUserSelectMenu() || interaction.isStringSelectMenu();
    try {
      if (selection) await interaction.deferUpdate();
      else await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const data = await settings(interaction.guildId);
      const id = interaction.customId;
      if (id === "kullanici_ekle" || id === "kullanici_kaldir") {
        const add = id === "kullanici_ekle";
        const panel = textPanel(add ? "Güvenli listeye eklenecek kullanıcıları seçin (en fazla 10)." : "Güvenli listeden çıkarılacak kullanıcıları seçin. Ayrılan üyeler için safelist kaldır ID komutunu kullanın.")
          .addActionRowComponents(new ActionRowBuilder().addComponents(new UserSelectMenuBuilder()
            .setCustomId(add ? "userSelect" : "userRemoveFromSafeList").setMinValues(1).setMaxValues(10).setPlaceholder("Kullanıcı seçin")));
        return interaction.editReply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      }
      if (id === "userSelect" || id === "userRemoveFromSafeList") {
        const add = id === "userSelect";
        await updateSafelist(interaction.guildId, interaction.values, add);
        interaction.client.logger.info("[Safelist panel] " + interaction.user.id + " • " + (add ? "ekle" : "kaldır") + " • " + interaction.values.join(", "));
        return interaction.editReply({ components: [textPanel("✅ " + interaction.values.length + " kullanıcı için " + (add ? "ekleme" : "kaldırma") + " tamamlandı.")], flags: MessageFlags.IsComponentsV2 });
      }
      if (id === "listele") {
        const text = "Güvenli liste • " + data.safelist.length + " kullanıcı\n" + (data.safelist.slice(0, 100).join("\n") || "Liste boş") + (data.safelist.length > 100 ? "\nDevamı: safelist liste 8" : "");
        return interaction.editReply({ components: [textPanel(text)], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (err) {
      interaction.client.logger.error("[Safelist panel] " + err.message);
      const payload = { components: [textPanel("❌ İşlem tamamlanamadı. Liste sınırını ve veritabanı bağlantısını kontrol edin.")], flags: MessageFlags.IsComponentsV2 };
      if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(() => {});
      else await interaction.reply({ content: "❌ İşlem tamamlanamadı.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  },
};
