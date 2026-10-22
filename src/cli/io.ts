/** Everything the CLI takes from its environment, injected so tests do not touch the process. */
export interface Io {
  out(text: string): void;
  err(text: string): void;
  /** Working directory, base of every relative path on the command line. */
  readonly cwd: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  /** True when the standard output is a terminal. */
  readonly isTTY: boolean;
}

export const processIo: Io = {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
  cwd: process.cwd(),
  env: process.env,
  isTTY: process.stdout.isTTY,
};
