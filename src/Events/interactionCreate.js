import { Events, UserSelectMenuBuilder, ActionRowBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, PermissionsBitField } from "discord.js";
import config from "../Base/config.js";
import Guild from "../Database/schemas/Guild.js";
import { settings } from "../Utils/guard.js";
import { updateSafelist } from "../Utils/safelist.js";
import { canRunCommand } from "../Utils/authorization.js";
import { UserInputError } from "../Utils/errors.js";
import { WindowCounter } from "../Utils/rateLimit.js";
import { resolveSlashDef, slashToArgs, wrapInteraction } from "../Utils/slash.js";
import { t, resolveLocale } from "../Utils/i18n.js";

const IDS = new Set(["kullanici_ekle", "kullanici_kaldir", "listele", "userSelect", "userRemoveFromSafeList"]);
const cooldown = new Map();
const ingress = new WindowCounter();
const textPanel = (text) => new ContainerBuilder().setAccentColor(0x0099ff).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

export default {
  name: Events.InteractionCreate, roles: ["guard3"],
  async execute(interaction) {
    if (interaction.isChatInputCommand()) return handleSlash(interaction);
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
        const items = data.safelist.slice(0, 100).map((uid) => `<@${uid}> (\`${uid}\`)`);
        const text = "Güvenli liste • " + data.safelist.length + " kullanıcı\n" + (items.join("\n") || "Liste boş") + (data.safelist.length > 100 ? "\nDevamı: safelist liste 8" : "");
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

async function handleSlash(interaction) {
  const { client } = interaction;
  const log = client.logger;
  const locale = resolveLocale(interaction.locale ?? interaction.guildLocale ?? interaction.guild?.preferredLocale);
  if (!interaction.guild) return interaction.reply({ content: t(locale, "error.guild_only"), flags: MessageFlags.Ephemeral }).catch(() => {});
  const def = resolveSlashDef(interaction);
  const command = def ? (client.commands.get(def.name) ?? client.commands.get(client.commandAliases.get(def.name))) : null;
  if (!command) return interaction.reply({ content: t(locale, "error.not_found"), flags: MessageFlags.Ephemeral }).catch(() => {});
  const args = slashToArgs(interaction, def);
  const priority = interaction.user.id === interaction.guild.ownerId || config.owners.includes(interaction.user.id);
  if (!priority && (ingress.hit(`user:${interaction.guild.id}:${interaction.user.id}`, 10000) > 10
    || ingress.hit(`guild:${interaction.guild.id}`, 10000) > 200)) {
    return interaction.reply({ content: "❌ Too many requests / Çok fazla istek.", flags: MessageFlags.Ephemeral }).catch(() => {});
  }
  try {
    await interaction.deferReply();
    const actor = interaction.member ?? await interaction.guild.members.fetch({ user: interaction.user.id, force: true }).catch(() => null);
    if (!actor) return interaction.editReply({ content: t(locale, "error.member_missing") }).catch(() => {});
    const data = await Guild.findOne({ guildId: interaction.guild.id }, { warns: 0 });
    if (!canRunCommand(command, actor, interaction.guild, data, args)) {
      return interaction.editReply({ content: t(locale, "error.no_permission") }).catch(() => {});
    }
    if (command.name !== "komut-kanal") {
      const allowed = data?.commandChannels ?? [];
      if ((allowed.length && !allowed.includes(interaction.channel.id)) || data?.disabledChannels?.includes(interaction.channel.id)) {
        return interaction.editReply({ content: t(locale, "error.no_channel") }).catch(() => {});
      }
    }
    const cd = (command.cooldown ?? 3) * 1000;
    const key = `${interaction.guild.id}:${command.name}:${interaction.user.id}`;
    if ((cooldown.get(key) ?? 0) > Date.now()) return interaction.editReply({ content: t(locale, "error.cooldown") }).catch(() => {});
    cooldown.set(key, Date.now() + cd);
    const timer = setTimeout(() => cooldown.delete(key), cd);
    timer.unref();
    const me = await interaction.guild.members.fetchMe();
    const missing = (command.botPerms ?? []).filter((name) => !me.permissions.has(PermissionsBitField.Flags[name]));
    if (missing.length) return interaction.editReply({ content: t(locale, "error.bot_perms", { perms: missing.join(", ") }) }).catch(() => {});

    log.info(`[Slash] ${interaction.user.tag} (${interaction.user.id}) #${interaction.channel?.name}: ${command.name} ${args.join(" ")}`.slice(0, 300));
    const wrapped = wrapInteraction(interaction);
    await command.run(client, wrapped, args);
  } catch (err) {
    log.error(`[Slash] ${command?.name} hatası: ${err.message}`);
    const safeErrors = [10007, 10013, 10026, 50001, 50013];
    const errorText = safeErrors.includes(err.code) ? t(locale, "error.discord")
      : err.name === "ValidationError" || err.name === "MongoServerError" ? t(locale, "error.db")
      : err instanceof UserInputError ? err.message : t(locale, "error.generic");
    const payload = { content: String(errorText).slice(0, 1800) };
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(() => {});
    else await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => {});
  }
}
