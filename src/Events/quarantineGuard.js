import { Events } from "discord.js";
import Quarantine from "../Database/schemas/Quarantine.js";
import { punish } from "../Utils/guard.js";

export default {
  name: Events.GuildMemberAdd, roles: ["guard1"],
  async execute(member) {
    if (!await Quarantine.exists({ _id: `${member.guild.id}:${member.id}` })) return;
    const result = await punish(member.guild, member.id, "quarantine", "Aktif karantina: yeniden katılım");
    member.guild.client.logger.warn(`[Karantina tekrar katılım] ${member.id}: ${result}`);
  },
};
