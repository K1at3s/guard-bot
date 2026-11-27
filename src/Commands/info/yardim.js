import { EmbedBuilder, Colors } from "discord.js";
import config from "../../Base/config.js";

export const commandBase = {
  name: "yardım", aliases: ["yardim", "help"],
  description: "Komutları ve erişim gereksinimlerini gösterir.", cooldown: 5,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const requested = args[0]?.toLowerCase();
    const command = client.commands.get(requested) ?? client.commands.get(client.commandAliases.get(requested));
    const category = requested && [...client.commands.values()].some((c) => c.category === requested) ? requested : null;
    if (requested && !command && !category) return message.reply(isTurkish ? "❌ Komut veya kategori bulunamadı. Kategoriler: info, mod, guard, setup, owner" : "❌ Command or category not found. Categories: info, mod, guard, setup, owner");
    const commands = command ? [command] : [...client.commands.values()].filter((c) =>
      (!category || c.category === category) && (!c.ownerOnly || config.owners.includes(message.author.id)) && (!c.perms || message.member.permissions.has(c.perms)));
    const lines = commands.map((c) => `**${config.prefix}${c.name}** — ${c.description || "Açıklama yok."}${command ? `\nKullanım: ${config.prefix}${c.name} ${c.usage || ""}\nKategori: ${c.category} • Bekleme: ${c.cooldown ?? 3} sn\nBot yetkileri: ${(c.botPerms ?? []).join(", ") || "Özel yetki gerekmiyor"}\nErişim: ${c.ownerOnly ? "Bot sahipleri" : c.trustedOnly ? "Ayar değişiklikleri için sahip veya güvenli listedeki yetkili" : "Komut yetkisi olan üyeler"}\nDiğer adlar: ${(c.aliases ?? []).join(", ") || "Yok"}${c.examples?.length ? `\nÖrnek: ${config.prefix}${c.name} ${c.examples[0]}` : ""}` : ""}`);
    const pages = [];
    let page = "";
    for (const line of lines) {
      if ((page + line).length > 3500) { pages.push(page); page = ""; }
      page += `${line}\n`;
    }
    if (page) pages.push(page);
    for (const description of pages) await message.channel.send({ embeds: [new EmbedBuilder()
      .setColor(Colors.Blurple).setTitle(isTurkish ? "Guard Bot • Komut rehberi" : "Guard Bot • Command guide").setDescription(description)
      .setFooter({ text: isTurkish ? `Ayrıntı: ${config.prefix}yardım komut • Güvenlik kontrolü: ${config.prefix}kontrol` : `Detail: ${config.prefix}help command • Security check: ${config.prefix}check` })] });
  },
};
