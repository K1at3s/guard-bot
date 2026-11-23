import { Events, PermissionsBitField } from "discord.js";
import config from "../Base/config.js";
import Guild from "../Database/schemas/Guild.js";
import { UserInputError } from "../Utils/errors.js";
import { canRunCommand } from "../Utils/authorization.js";
import { WindowCounter } from "../Utils/rateLimit.js";
import { redactSecrets } from "../Utils/secrets.js";

const cooldown = new Map();
const ingress = new WindowCounter();

export default {
  name: Events.MessageCreate,
  roles: ["guard3"],
  async execute(message) {
    if (!message.guild || message.author.bot) return;
    const { client } = message;
    const log = client.logger;
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/\s+/g);
    const cmd = args.shift().toLowerCase();
    if (!cmd) return;
    const command = client.commands.get(cmd) ?? client.commands.get(client.commandAliases.get(cmd));
    if (!command) return;
    const priority = message.author.id === message.guild.ownerId || config.owners.includes(message.author.id);
    if (!priority && (ingress.hit(`user:${message.guild.id}:${message.author.id}`, 10000) > 10
      || ingress.hit(`guild:${message.guild.id}`, 10000) > 200)) return;

    try {
      const actor = await message.guild.members.fetch({ user: message.author.id, force: true }).catch(() => null);
      if (!actor) return message.reply("❌ Üye bilgisi alınamadı (sunucudan ayrılmış olabilir).").catch(() => {});
      const data = await Guild.findOne({ guildId: message.guild.id }, { warns: 0 });
      const helpRequested = ["yardım", "yardim", "help", "--help"].includes(args[0]);
      if (!canRunCommand(command, actor, message.guild, data, helpRequested ? ["--help"] : args)) {
        if (helpRequested && canRunCommand({ ...command, trustedOnly: false }, actor, message.guild, data, [])) {
          // Yardım yalnız komut yetkisine sahip kişilere gösterilir.
        } else return message.reply("❌ Bu komut için yetkiniz yok. Koruma ayarları sahip veya güvenli listedeki yetkililere açıktır.");
      }
      if (command.name !== "komut-kanal") {
        const allowed = data?.commandChannels ?? [];
        if ((allowed.length && !allowed.includes(message.channel.id)) || data?.disabledChannels?.includes(message.channel.id)) return;
      }
      const cd = (command.cooldown ?? 3) * 1000;
      const key = `${message.guild.id}:${command.name}:${message.author.id}`;
      if ((cooldown.get(key) ?? 0) > Date.now()) return;
      cooldown.set(key, Date.now() + cd);
      const timer = setTimeout(() => cooldown.delete(key), cd);
      timer.unref();
      if (helpRequested) return client.commands.get("yardım").run(client, message, [command.name]);
      const me = await message.guild.members.fetchMe();
      const missing = (command.botPerms ?? []).filter((name) => !me.permissions.has(PermissionsBitField.Flags[name]));
      if (missing.length) return message.reply(`❌ Botun eksik yetkileri: ${missing.join(", ")}`);

      log.info(redactSecrets(`[Komut] ${message.author.tag} (${message.author.id}) #${message.channel.name}: ${command.name} ${args.join(" ")}`).slice(0, 300));
      await command.run(client, message, args);
    } catch (err) {
      log.error(`[Komut] ${command.name} hatası: ${err.message}`);
      const safeErrors = [10007, 10013, 10026, 50001, 50013];
      const errorText = safeErrors.includes(err.code) ? "Discord erişimi reddetti veya hedef bulunamadı. Botun yetkilerini ve rol sırasını kontrol edin."
        : err.name === "ValidationError" || err.name === "MongoServerError" ? "Veritabanına işlem kaydedilemedi."
        : err instanceof UserInputError ? err.message : "İşlem tamamlanamadı; hata kaydını kontrol edin.";
      await message.reply(`❌ ${errorText}`.slice(0, 1800)).catch(() => {});
    }
  },
};
