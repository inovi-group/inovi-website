import type { MetadataRoute } from "next";
import { SITE } from "@/i18n";

export const dynamic = "force-static";

/**
 * Crawler rules. Default: search engines and AI search/answer bots may crawl everything (so INOVI can be found and
 * cited); crawlers that only collect training data are blocked.
 *
 * TO FLIP IT: move a bot between the two lists below. To allow training crawlers too, move them into SEARCH_AND_ANSWER
 * (or delete TRAINING_ONLY); to block an answer bot, move it into TRAINING_ONLY.
 */
const SEARCH_AND_ANSWER = [
  "Googlebot", "Bingbot", "DuckDuckBot", "Applebot", "YandexBot",
  "OAI-SearchBot", "ChatGPT-User",          // OpenAI: ChatGPT search, and fetches a user asked for
  "Claude-SearchBot", "Claude-User",        // Anthropic: Claude search, and fetches a user asked for
  "PerplexityBot", "Perplexity-User",       // Perplexity: search index, and user fetches
  "DuckAssistBot", "MistralAI-User",
];
const TRAINING_ONLY = [
  "GPTBot",            // OpenAI model training
  "ClaudeBot",         // Anthropic model training
  "CCBot",             // Common Crawl (widely used for training)
  "Google-Extended",   // Gemini training (does not affect Google Search)
  "Applebot-Extended", // Apple model training (does not affect Applebot search)
  "Meta-ExternalAgent", "Bytespider", "cohere-training-data-crawler", "Diffbot", "Omgilibot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: SEARCH_AND_ANSWER, allow: "/" },
      { userAgent: TRAINING_ONLY, disallow: "/" },
      { userAgent: "*", allow: "/" },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
