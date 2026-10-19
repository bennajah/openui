import process from "node:process";

/** Terminal output helpers with color support detection. */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function paint(code: string, text: string): string {
  return useColor ? `\x1b[${code}m${text}\x1b[0m` : text;
}

export const ui = {
  bold: (t: string) => paint("1", t),
  dim: (t: string) => paint("2", t),
  green: (t: string) => paint("32", t),
  yellow: (t: string) => paint("33", t),
  red: (t: string) => paint("31", t),
  cyan: (t: string) => paint("36", t),
  info(message: string): void {
    console.log(`${ui.cyan("i")} ${message}`);
  },
  success(message: string): void {
    console.log(`${ui.green("✔")} ${message}`);
  },
  warn(message: string): void {
    console.warn(`${ui.yellow("!")} ${message}`);
  },
  error(message: string): void {
    console.error(`${ui.red("✖")} ${message}`);
  },
  step(message: string): void {
    console.log(`  ${ui.dim("·")} ${message}`);
  },
};
