import mongoose from "mongoose";
import { report } from "../../Utils/command.js";
export const commandBase = {
  name: "kapat", aliases: ["shutdown"], description: "Botun durumunu gösterir; açık onayla bu süreci kapatır.", ownerOnly: true, cooldown: 5,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    if (args[0] !== "ONAY") return report(message, isTurkish ? "Sistem durumu" : "System status", [[isTurkish?"Görev":"Role", client.role], [isTurkish?"Çalışma süresi":"Uptime", Math.floor(process.uptime()) + (isTurkish?" saniye":" seconds")], [isTurkish?"Kapatma":"Shutdown", isTurkish ? "kapat ONAY — yalnız bu bot süreci kapanır" : "shutdown CONFIRM — shuts down only this bot process"]]);
    await message.channel.send("🛑 " + client.role + (isTurkish ? " bağlantıları kapatılıyor..." : " connections are closing..."));
    client.logger.warn("[Sistem] " + message.author.id + " kapattı: " + client.role);
    client.destroy();
    await mongoose.disconnect();
    process.exit(0);
  },
};
