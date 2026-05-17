import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { ImageContent } from "@earendil-works/pi-ai";

const IMAGE_PATH_RE = /(?:^|\s)(\/[^\s'"`]+\.(?:png|jpe?g|gif|webp))(?:\s|$)/gi;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function mediaTypeFor(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".gif": return "image/gif";
    case ".webp": return "image/webp";
    default: return undefined;
  }
}

function imageFromPath(filePath: string): ImageContent | undefined {
  const mediaType = mediaTypeFor(filePath);
  if (!mediaType || !existsSync(filePath)) return undefined;

  const stat = statSync(filePath);
  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_IMAGE_BYTES) return undefined;

  return {
    type: "image",
    source: {
      type: "base64",
      mediaType,
      data: readFileSync(filePath).toString("base64"),
    },
  };
}

export default function (pi: ExtensionAPI) {
  pi.on("input", async (event, ctx) => {
    if (event.source === "extension") return { action: "continue" };

    const found: string[] = [];
    for (const match of event.text.matchAll(IMAGE_PATH_RE)) {
      const candidate = match[1];
      if (candidate) found.push(candidate);
    }

    if (found.length === 0) return { action: "continue" };

    const existingImages = event.images ?? [];
    const attached: ImageContent[] = [];
    const attachedPaths = new Set<string>();

    for (const filePath of found) {
      const image = imageFromPath(filePath);
      if (!image) continue;
      attached.push(image);
      attachedPaths.add(filePath);
    }

    if (attached.length === 0) return { action: "continue" };

    const text = event.text
      .replace(IMAGE_PATH_RE, (full, filePath: string) => {
        if (!attachedPaths.has(filePath)) return full;
        return full.startsWith(" ") || full.endsWith(" ") ? " " : "";
      })
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    ctx.ui.notify(`Attached ${attached.length} image${attached.length === 1 ? "" : "s"} from pasted path.`, "info");

    return {
      action: "transform",
      text: text || "Please use the attached image(s).",
      images: [...existingImages, ...attached],
    };
  });
}
