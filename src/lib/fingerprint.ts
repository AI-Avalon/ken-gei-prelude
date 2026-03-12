// Crescendo — Fingerprint Generation

import { normalize, sha256 } from './utils';

export async function generateFingerprint(
  date: string,
  venueName: string,
  title: string
): Promise<string> {
  const input = `${date}|${normalize(venueName)}|${normalize(title).slice(0, 10)}`;
  return sha256(input);
}
