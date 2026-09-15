import type { QueryPlan } from "../types.js";

const STOPWORDS = new Set(
  `a an and or the for with without to of in on at by from as is are be been being it its this that these those
   my your our their want like need using use used make makes made new simple small lightweight based`
    .split(/\s+/)
    .filter(Boolean),
);

/** Acronyms too generic to be useful as standalone product-name queries. */
const GENERIC_ACRONYMS = new Set(
  `CLI TUI UI API SDK AI ML GUI REST JSON HTTP HTTPS SQL CSS HTML OS IDE DB URL CPU GPU RAM`.split(/\s+/),
);

/** Single-token tags too broad to be useful topic queries. */
const WEAK_TOPICS = new Set(
  `cli app tool tools web data api ui side code file files test tests server client library framework
   preview previews using built simple small new`.split(/\s+/),
);

const PRESERVED_PATTERNS: RegExp[] = [
  /"([^"]+)"/g,
  /'([^']+)'/g,
  /\b[A-Z]{2,}\b/g,
  /\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b/g,
  /\b[a-z]+(?:-[a-z0-9]+)+\b/g,
  /\b[A-Za-z]+-?\d+(?:\.\d+)*[a-z]?\b/g,
];

function firstSentence(text: string): string {
  const sentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  return sentence.replace(/\s+/g, " ").trim().slice(0, 200);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

/** Proper nouns and jargon that must survive verbatim into queries. */
export function extractPreservedTerms(text: string): string[] {
  const found: string[] = [];
  for (const pattern of PRESERVED_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const term = match[1] ?? match[0];
      if (term && !STOPWORDS.has(term.toLowerCase())) found.push(term);
    }
  }
  // Prefer longer compounds: drop terms that are substrings of another match.
  const terms = unique(found).sort((a, b) => b.length - a.length);
  const kept: string[] = [];
  for (const term of terms) {
    if (!kept.some((existing) => existing.toLowerCase().includes(term.toLowerCase()))) kept.push(term);
  }
  return kept.slice(0, 8);
}

/** Capitalized tokens that are not sentence-initial, plus non-generic acronyms. */
export function extractProductNames(text: string, preservedTerms: string[]): string[] {
  const names: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const tokens = sentence.split(/\s+/).slice(1);
    for (const token of tokens) {
      const word = token.replace(/[^A-Za-z0-9.+-]/g, "");
      if (!/^[A-Z][A-Za-z0-9.+-]*$/.test(word) || word.length <= 2) continue;
      if (GENERIC_ACRONYMS.has(word)) continue;
      names.push(word);
    }
  }
  for (const term of preservedTerms) {
    if (/^[A-Z]{2,}$/.test(term) && !GENERIC_ACRONYMS.has(term)) names.push(term);
  }
  return unique(names).slice(0, 4);
}

/** Content-word phrases: preserved compounds, a short full phrase, then bigrams. */
export function extractKeywordPhrases(text: string, preservedTerms: string[]): string[] {
  const words: string[] = [];
  for (const word of text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)) {
    if (word.length > 2 && !STOPWORDS.has(word) && words.at(-1) !== word) words.push(word);
  }

  const preserved = new Set(preservedTerms.map((term) => term.toLowerCase()));
  const phrases: Array<{ phrase: string; score: number; index: number }> = [];
  let index = 0;

  for (const term of preservedTerms) {
    if (term.includes(" ") || term.includes("-")) {
      phrases.push({ phrase: term, score: 4, index: index++ });
    }
  }
  if (words.length >= 2 && words.length <= 4) {
    phrases.push({ phrase: words.join(" "), score: 3, index: index++ });
  }
  for (let i = 0; i + 1 < words.length; i += 1) {
    const pair = `${words[i]} ${words[i + 1]}`;
    const onTopic = preserved.has(words[i] ?? "") || preserved.has(words[i + 1] ?? "");
    phrases.push({ phrase: pair, score: onTopic ? 3 : 2, index: index++ });
  }

  const ranked = phrases
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.phrase);

  return unique(ranked).slice(0, 3);
}

/** Distinctive single-token tags, preferring preserved terms and product names. */
export function extractTopics(values: string[], preservedTerms: string[] = []): string[] {
  const topics: string[] = [];
  const consider = (value: string) => {
    const token = value.toLowerCase();
    if (/^[a-z0-9]+$/.test(token) && token.length > 2 && !WEAK_TOPICS.has(token)) topics.push(token);
  };

  for (const term of preservedTerms) consider(term);
  for (const value of values) {
    for (const token of value.toLowerCase().split(/[\s-]+/)) {
      if (token.length > 2 && !STOPWORDS.has(token)) consider(token);
    }
  }
  return unique(topics).slice(0, 3);
}

/** Build a deterministic, source-agnostic query plan from a raw idea. */
export function planQueries(idea: string): QueryPlan {
  const text = idea.replace(/\s+/g, " ").trim();
  const preservedTerms = extractPreservedTerms(text);
  const productNames = extractProductNames(text, preservedTerms);
  const keywords = extractKeywordPhrases(text, preservedTerms);
  const topics = extractTopics([...keywords, ...productNames], preservedTerms);

  return {
    sharpened: firstSentence(text),
    keywords,
    productNames,
    topics,
    preservedTerms,
  };
}
