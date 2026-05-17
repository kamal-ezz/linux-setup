import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

function shortPath(cwd: string): string {
  const home = homedir();
  const display = cwd === home ? "~" : cwd.startsWith(home + path.sep) ? "~" + cwd.slice(home.length) : cwd;
  const parts = display.split(path.sep);
  if (display.startsWith("~") && parts.length > 4) {
    return [parts[0], "…", ...parts.slice(-2)].join(path.sep);
  }
  return display;
}

function gitBranch(cwd: string): string | undefined {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 300,
    }).trim() || undefined;
  } catch {
    return undefined;
  }
}

function modelLabel(ctx: ExtensionContext): string | undefined {
  const model = ctx.model;
  if (!model) return undefined;
  return `${model.provider}/${model.id}`;
}

function installFooter(ctx: ExtensionContext) {
  const cwd = shortPath(ctx.cwd);
  const branch = gitBranch(ctx.cwd);
  const model = modelLabel(ctx);

  ctx.ui.setFooter((_tui, theme) => ({
    render(width: number) {
      const left = branch ? `${cwd} (${branch})` : cwd;
      const right = model ?? "";
      if (!right) return [theme.fg("dim", left)];

      const gap = Math.max(1, width - left.length - right.length);
      return [theme.fg("dim", `${left}${" ".repeat(gap)}${right}`)];
    },
    invalidate() {},
  }));
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    installFooter(ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    installFooter(ctx);
  });
}
