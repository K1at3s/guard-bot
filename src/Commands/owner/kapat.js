import mongoose from "mongoose";
import { report } from "../../Utils/command.js";
export const commandBase = {
  name: "kapat", aliases: ["shutdown"], description: "Botun durumunu gösterir; açık onayla bu süreci kapatır.", ownerOnly: true, cooldown: 5,
  async run(client, message, args) {
    if (args[0] !== "ONAY") return report(message, "Sistem durumu", [["Görev", client.role], ["Çalışma süresi", Math.floor(process.uptime()) + " saniye"], ["Kapatma", "kapat ONAY — yalnız bu bot süreci kapanır"]]);
    await message.channel.send("🛑 " + client.role + " bağlantıları kapatılıyor...");
    client.logger.warn("[Sistem] " + message.author.id + " kapattı: " + client.role);
    client.destroy();
    await mongoose.disconnect();
    process.exit(0);
  },
};
