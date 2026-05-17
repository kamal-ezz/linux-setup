import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const execFileAsync = promisify(execFile);
const FOCUS_IN = "\x1b[I";
const FOCUS_OUT = "\x1b[O";

let terminalFocused = true;
let focusTrackingEnabled = false;
let dataHandler: ((data: Buffer | string) => void) | undefined;

async function sendMacOS(title: string, message: string): Promise<void> {
  const script = `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`;
  await execFileAsync("osascript", ["-e", script]);
}

async function sendLinux(title: string, message: string): Promise<void> {
  await execFileAsync("notify-send", [title, message]);
}

async function sendNotification(title: string, message: string, ctx: ExtensionContext): Promise<void> {
  try {
    if (process.platform === "darwin") {
      await sendMacOS(title, message);
    } else if (process.platform === "linux") {
      await sendLinux(title, message);
    } else {
      ctx.ui.notify(message, "info");
    }
  } catch {
    ctx.ui.notify(message, "info");
  }
}

function enableFocusTracking() {
  if (focusTrackingEnabled || !process.stdin.isTTY || !process.stdout.isTTY) return;

  focusTrackingEnabled = true;
  terminalFocused = true;
  process.stdout.write("\x1b[?1004h");

  dataHandler = (data: Buffer | string) => {
    const text = typeof data === "string" ? data : data.toString("utf8");
    if (text.includes(FOCUS_IN)) terminalFocused = true;
    if (text.includes(FOCUS_OUT)) terminalFocused = false;
  };

  process.stdin.on("data", dataHandler);
}

function disableFocusTracking() {
  if (!focusTrackingEnabled) return;

  if (dataHandler) {
    process.stdin.off("data", dataHandler);
    dataHandler = undefined;
  }

  if (process.stdout.isTTY) {
    process.stdout.write("\x1b[?1004l");
  }

  focusTrackingEnabled = false;
  terminalFocused = true;
}

export default function (pi: ExtensionAPI) {
  const title = "Pi";
  const defaultMessage = "Waiting for your input";

  pi.on("session_start", async () => {
    enableFocusTracking();
  });

  pi.on("session_shutdown", async () => {
    disableFocusTracking();
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (terminalFocused) return;
    await sendNotification(title, defaultMessage, ctx);
  });

}
