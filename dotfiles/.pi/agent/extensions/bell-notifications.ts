import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function tryPlay(command: string, args: string[]) {
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function ringBell() {
  // Sound only: do not call pi.ui.notify or any desktop notification API.
  if (tryPlay("canberra-gtk-play", ["-i", "bell"])) return;
  if (tryPlay("paplay", ["/usr/share/sounds/freedesktop/stereo/bell.oga"])) return;

  // Fallback to terminal BEL if no sound helper is available.
  if (process.stdout.isTTY) {
    process.stdout.write("\x07");
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("agent_end", ringBell);
}
