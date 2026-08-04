/*
 * skills.sh integration. Deep module: owns the upstream fetch, the HTML row
 * parsing, and the local installed-skill scan. index.mjs just routes to these
 * functions and serializes JSON — no markup or HTTP knowledge lives there.
 *
 * The leaderboard pages (/, /trending, /hot) are server-rendered HTML; rows
 * share one stable structure:
 *
 *   <a class="group grid grid-cols-[auto_1fr_auto] ..." href="/owner/repo/skill">
 *     <span class="...font-mono">1</span>                      rank
 *     <h3 class="font-semibold text-foreground truncate ...">find-skills</h3>
 *     <p class="...font-mono ... truncate">vercel-labs/skills</p>
 *     <span class="font-mono text-sm text-foreground">2.8M</span>  installs (abbrev)
 *
 * Search hits the public /api/search endpoint (no auth). Install counts there
 * are exact numbers; on the leaderboard pages they are abbreviated ("2.8M").
 */

import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = process.env.SKILLS_BASE_URL || "https://skills.sh";
const SEARCH_LIMIT = 100;
const CACHE_TTL_MS = 60_000;

const VIEW_PATH = {
  "all-time": "/",
  trending: "/trending",
  hot: "/hot",
};

const leaderboardCache = new Map();

function installUrlFor(source) {
  // Paths like /site/open.feishu.cn/... are well-known sources, not GitHub repos.
  if (source.startsWith("site/")) return null;
  return `https://github.com/${source}`;
}

function parseFrontmatterName(text) {
  const m = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!m) return null;
  const name = m[1].match(/^name:\s*(.+)$/m);
  if (!name) return null;
  return name[1].trim().replace(/^["']|["']$/g, "");
}

function parseRows(html) {
  const rows = [];
  const rowRe =
    /<a class="group grid grid-cols-\[auto_1fr_auto\][^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let match;
  while ((match = rowRe.exec(html)) !== null) {
    const href = match[1];
    const body = match[2];
    if (!href.startsWith("/")) continue;

    const path = href.split("/").filter(Boolean);
    if (path.length < 3) continue;
    const source = path.slice(0, -1).join("/");
    const slug = path[path.length - 1];

    const h3 = body.match(/<h3[^>]*>([^<]+)<\/h3>/);
    const src = body.match(/<p class="[^"]*truncate"[^>]*>([^<]+)<\/p>/);
    const rank = body.match(
      /class="[^"]*font-mono[^"]*"[^>]*>([\d,]+)<\/span>/,
    );
    const installs = body.match(
      /<span class="font-mono text-sm text-foreground">([^<]+)<\/span>/,
    );
    if (!h3 || !src || !installs) continue;

    rows.push({
      id: `${source}/${slug}`,
      source,
      slug,
      name: h3[1].replace(/&amp;/g, "&").trim(),
      rank: rank ? parseInt(rank[1].replace(/,/g, ""), 10) : rows.length + 1,
      installs: installs[1].trim(),
      installsRaw: null,
      url: `${BASE}${href}`,
      installUrl: installUrlFor(source),
    });
  }
  return rows;
}

export async function getSkillsLeaderboard(view) {
  const path = VIEW_PATH[view];
  if (!path)
    throw new Error(
      `unknown leaderboard view "${view}" (use all-time, trending, or hot)`,
    );

  const cached = leaderboardCache.get(view);
  if (cached && Date.now() < cached.expiresAt) return cached.payload;

  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": "opencode-token-tracker/1.0" },
  });
  if (!res.ok) throw new Error(`skills.sh responded ${res.status} for ${path}`);

  const html = await res.text();
  const skills = parseRows(html);
  const payload = { view, skills, fetchedAt: new Date().toISOString() };
  leaderboardCache.set(view, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
  return payload;
}

export async function searchSkills(query) {
  const params = new URLSearchParams({ q: query, limit: String(SEARCH_LIMIT) });
  const res = await fetch(`${BASE}/api/search?${params}`, {
    headers: { "User-Agent": "opencode-token-tracker/1.0" },
  });
  if (!res.ok) throw new Error(`skills.sh search responded ${res.status}`);

  const data = await res.json();
  const skills = (data.skills ?? []).map((s) => ({
    id: s.id,
    source: s.source,
    slug: s.skillId ?? s.id,
    name: s.name,
    rank: null,
    installs: formatCompact(s.installs),
    installsRaw: s.installs ?? null,
    url: `${BASE}/${s.id}`,
    installUrl: installUrlFor(s.source),
  }));
  return {
    query: data.query ?? query,
    searchType: data.searchType ?? "fuzzy",
    count: data.count ?? skills.length,
    skills,
  };
}

function formatCompact(n) {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

async function scanSkillDir(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isDirectory()) return;
      const skillDir = join(dir, entry.name);
      const skillFile = join(skillDir, "SKILL.md");
      try {
        const text = await readFile(skillFile, "utf8");
        const name = parseFrontmatterName(text) || entry.name;
        found.push(name.toLowerCase());
      } catch {
        /* not a skill directory — skip */
      }
    }),
  );
  return found;
}

export async function getInstalledSkills() {
  const dirs = [
    join(homedir(), ".config", "opencode", "skills"),
    join(homedir(), ".agents", "skills"),
    join(homedir(), ".opencode", "skills"),
    join(process.cwd(), ".agents", "skills"),
    join(process.cwd(), ".opencode", "skills"),
  ];
  const names = new Set();
  for (const dir of dirs) {
    for (const name of await scanSkillDir(dir)) names.add(name);
  }
  return { names: [...names].sort() };
}
