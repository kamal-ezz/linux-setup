import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

const LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const satisfies readonly ThinkingLevel[];

const DESCRIPTIONS: Record<ThinkingLevel, string> = {
  off: "No reasoning",
  minimal: "Very brief reasoning (~1k tokens)",
  low: "Light reasoning (~2k tokens)",
  medium: "Moderate reasoning (~8k tokens)",
  high: "Deep reasoning (~16k tokens)",
  xhigh: "Maximum reasoning (~32k tokens)",
};

const ALIASES: Record<string, ThinkingLevel> = {
  none: "off",
  no: "off",
  zero: "off",
  min: "minimal",
  med: "medium",
  mid: "medium",
  max: "xhigh",
  maximum: "xhigh",
  extra: "xhigh",
  "extra-high": "xhigh",
  veryhigh: "xhigh",
  "very-high": "xhigh",
};

function parseLevel(input: string): ThinkingLevel | undefined {
  const value = input.trim().toLowerCase();
  if (!value) return undefined;
  if ((LEVELS as readonly string[]).includes(value)) return value as ThinkingLevel;
  return ALIASES[value];
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("effort", {
    description: "Set reasoning effort: off, minimal, low, medium, high, xhigh",
    getArgumentCompletions: (prefix) => {
      const normalized = prefix.trim().toLowerCase();
      return LEVELS
        .filter((level) => level.startsWith(normalized))
        .map((level) => ({
          value: level,
          label: level,
          description: DESCRIPTIONS[level],
        }));
    },
    handler: async (args, ctx) => {
      const trimmedArgs = args.trim();
      let level = parseLevel(trimmedArgs);

      if (!level && trimmedArgs.length === 0) {
        const current = pi.getThinkingLevel();
        const choice = await ctx.ui.select(
          "Reasoning effort",
          LEVELS.map((candidate) => {
            const marker = candidate === current ? " ✓" : "";
            return `${candidate}${marker} — ${DESCRIPTIONS[candidate]}`;
          }),
        );
        if (!choice) return;
        level = parseLevel(choice.split(/[\s—-]/, 1)[0] ?? "");
      }

      if (!level) {
        ctx.ui.notify(`Usage: /effort <${LEVELS.join("|")}>`, "warning");
        return;
      }

      const before = pi.getThinkingLevel();
      pi.setThinkingLevel(level);
      const after = pi.getThinkingLevel();
      const clamped = after !== level ? ` (clamped from ${level})` : "";
      const unchanged = after === before ? " already" : "";

      ctx.ui.notify(`Reasoning effort${unchanged} set to ${after}${clamped}.`, "info");
    },
  });
}
