const BULLET_PATTERN =
  /^\s*(?:[•·▪▫▸▹‣◦‧⁃◆◇►❖➤➢✓✔☑*+\-–—]|\(\d{1,3}\)|\d{1,3}[.)]|[A-Za-z][.)])\s+/u;

export function isBulletLine(line: string): boolean {
  return BULLET_PATTERN.test(line.normalize("NFKC"));
}

export function countBullets(lines: readonly string[]): number {
  return lines.filter(isBulletLine).length;
}
