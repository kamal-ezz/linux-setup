import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

const MAX_TOOL_BYTES = 50 * 1024;
const MAX_TOOL_LINES = 2000;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function truncateForTool(text: string): string {
  const lines = text.split("\n");
  let truncated = lines.length > MAX_TOOL_LINES ? lines.slice(0, MAX_TOOL_LINES).join("\n") : text;
  if (Buffer.byteLength(truncated, "utf8") > MAX_TOOL_BYTES) {
    truncated = Buffer.from(truncated, "utf8").subarray(0, MAX_TOOL_BYTES).toString("utf8");
  }
  if (truncated.length < text.length) {
    truncated += "\n\n[truncated]";
  }
  return truncated;
}

function normalizeDuckDuckGoUrl(rawHref: string): string {
  const href = decodeHtml(rawHref);
  try {
    const parsed = new URL(href, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : parsed.href;
  } catch {
    return href;
  }
}

function parseDuckDuckGoHtml(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const linkRegex = /<a[^>]+class=["'][^"']*(?:result__a|result-link)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) && results.length < maxResults) {
    const url = normalizeDuckDuckGoUrl(match[1]);
    if (!url || seen.has(url) || url.includes("duckduckgo.com/y.js")) continue;

    const title = stripTags(match[2]);
    if (!title) continue;

    const afterLink = html.slice(linkRegex.lastIndex, linkRegex.lastIndex + 2500);
    const snippetMatch = afterLink.match(/<[^>]+class=["'][^"']*(?:result__snippet|result-snippet)[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div|td)>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : undefined;

    seen.add(url);
    results.push({ title, url, snippet });
  }

  return results;
}

function extractReadableText(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i)?.[1];

  let body = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
    .replace(/<(?:p|br|div|section|article|h[1-6]|li|tr|blockquote)\b[^>]*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ");

  body = decodeHtml(body)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  const parts = [];
  if (title) parts.push(`# ${stripTags(title)}`);
  if (description) parts.push(stripTags(description));
  if (body) parts.push(body);
  return parts.join("\n\n");
}

async function fetchWithTimeout(url: string, signal: AbortSignal | undefined, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 pi-web-search/2.0",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: "Free no-API-key web search using DuckDuckGo HTML results.",
    promptSnippet: "Search the web for current information without an API key.",
    promptGuidelines: [
      "Use web_search when the user asks for current, recent, or external information that may not be in the model's training data.",
      "Cite web_search result URLs when using information from search results.",
      "Use web_fetch on promising search result URLs when snippets are not enough.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search query." }),
      maxResults: Type.Optional(Type.Integer({ description: "Number of results to return, 1-10. Default: 5." })),
    }),
    async execute(_toolCallId, params, signal) {
      const query = params.query.trim();
      const maxResults = Math.max(1, Math.min(10, params.maxResults ?? 5));
      if (!query) {
        return { isError: true, content: [{ type: "text", text: "web_search error: query must not be empty." }] };
      }

      try {
        const response = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, signal, 10000);
        if (!response.ok) throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
        const results = parseDuckDuckGoHtml(await response.text(), maxResults);
        const text = results.length
          ? results.map((result, index) => `${index + 1}. ${result.title}\n   ${result.url}${result.snippet ? `\n   ${result.snippet}` : ""}`).join("\n\n")
          : `No web results found for: ${query}`;
        return { content: [{ type: "text", text }], details: { query, source: "duckduckgo-html", results } };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: `web_search error: ${message}` }], details: { query, results: [] } };
      }
    },
  });

  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description: "Fetch a webpage and return readable text. Free and no API key required.",
    promptSnippet: "Fetch readable text from a URL.",
    promptGuidelines: [
      "Use web_fetch to read selected URLs from web_search results before relying on details from those pages.",
      "Cite the fetched URL when using information from web_fetch.",
    ],
    parameters: Type.Object({
      url: Type.String({ description: "HTTP or HTTPS URL to fetch." }),
    }),
    async execute(_toolCallId, params, signal) {
      let url: URL;
      try {
        url = new URL(params.url);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("URL must use http or https");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: `web_fetch error: ${message}` }] };
      }

      try {
        const response = await fetchWithTimeout(url.href, signal, 15000);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentType = response.headers.get("content-type") ?? "";
        const raw = await response.text();
        const text = contentType.includes("html") ? extractReadableText(raw) : raw;
        return {
          content: [{ type: "text", text: truncateForTool(`URL: ${response.url}\nContent-Type: ${contentType || "unknown"}\n\n${text}`) }],
          details: { url: url.href, finalUrl: response.url, contentType },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: `web_fetch error: ${message}` }], details: { url: url.href } };
      }
    },
  });
}
