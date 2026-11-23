import { UserInputError } from "./errors.js";
import Guild from "../Database/schemas/Guild.js";
import { snowflake } from "./command.js";

export async function updateSafelist(guildId, ids, add) {
  const unique = [...new Set(ids)];
  if (!unique.length || unique.some((id) => snowflake(id) !== id)) throw new UserInputError("Geçersiz kullanıcı ID'si.");
  await Guild.updateOne({ guildId }, { $setOnInsert: { guildId } }, { upsert: true });
  const filter = { guildId };
  if (add) filter.$expr = { $lte: [{ $size: { $setUnion: [{ $ifNull: ["$safelist", []] }, unique] } }, 200] };
  const result = await Guild.updateOne(filter, add ? { $addToSet: { safelist: { $each: unique } } } : { $pull: { safelist: { $in: unique } } });
  if (!result.matchedCount) throw new UserInputError("Güvenli liste en fazla 200 kullanıcı içerebilir.");
  return result.modifiedCount;
}
