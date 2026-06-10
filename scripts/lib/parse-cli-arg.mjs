/**
 * Read CLI flag values safely (avoids argv[-1] → node.exe on Windows when flag is missing).
 */
export function readCliArg(argv, flag) {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);

  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) {
    const next = argv[idx + 1];
    if (!next.startsWith("-")) return next;
  }
  return undefined;
}
