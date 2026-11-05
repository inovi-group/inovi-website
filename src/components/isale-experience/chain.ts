// FIRMA v2.0 record hashing, computed in the browser.
// Matches the reference validator (firma-spec/validators/python/firma/crypto.py):
//   record_hash = SHA3-512(firma_id + record_type + version + actor_id
//                          + canonical_json(content) + timestamp_utc + (predecessor_hash ?? ""))
import { sha3_512 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

export type FirmaRecord = {
  firma_id: string;
  record_type: string;
  version: string;
  actor_id: string;
  content: Record<string, unknown>;
  timestamp_utc: string;
  predecessor_hash: string | null;
  record_hash?: string;
};

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

export function computeHash(r: FirmaRecord): string {
  const payload = r.firma_id + r.record_type + r.version + r.actor_id + canonical(r.content) + r.timestamp_utc + (r.predecessor_hash ?? "");
  return bytesToHex(sha3_512(utf8ToBytes(payload)));
}

export const short = (h: string | null | undefined) => (h ? `${h.slice(0, 4)}…${h.slice(-4)}` : "null");
