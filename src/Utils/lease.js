import { randomUUID } from "node:crypto";
import OperationLease from "../Database/schemas/OperationLease.js";
import { UserInputError } from "./errors.js";

const DURATION_MS = 20 * 60000;
export async function acquireLease(key) {
  const owner = randomUUID();
  let until = Date.now() + DURATION_MS;
  try {
    const acquired = await OperationLease.findOneAndUpdate({ _id: key, expiresAt: { $lte: new Date() } },
      { $set: { owner, expiresAt: new Date(until) } }, { upsert: true, new: true });
    if (acquired?.owner !== owner) throw new Error("İşlem kilidinin sahipliği doğrulanamadı.");
  } catch (err) {
    if (err.code === 11000) throw new UserInputError("Bu sunucuda başka bir yedek/geri yükleme işlemi sürüyor.");
    throw err;
  }
  let lost = false;
  let renewing = false;
  const timer = setInterval(async () => {
    if (renewing || lost) return;
    renewing = true;
    try {
      const next = Date.now() + DURATION_MS;
      const result = await OperationLease.updateOne({ _id: key, owner, expiresAt: { $gt: new Date() } }, { $set: { expiresAt: new Date(next) } });
      if (!result.matchedCount) lost = true;
      else until = next;
    } catch { lost = true; }
    finally { renewing = false; }
  }, 30000);
  timer.unref();
  return {
    assert() { if (lost || Date.now() >= until) throw new UserInputError("İşlem kilidi kaybedildi; güvenlik için işlem durduruldu."); },
    async release() { clearInterval(timer); await OperationLease.deleteOne({ _id: key, owner }); },
  };
}
