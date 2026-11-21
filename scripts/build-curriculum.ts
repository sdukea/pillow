// Extracts the curriculum's source problem lists from sumitsingh4411/faang (MIT) into
// src/curriculum/sources.json. Run: npm run curriculum -- [path to faang checkout]
//
// Only what the lists state is kept: the slug from the official URL, the title, the
// difficulty, and each list's section and topic. Nothing is invented: no problem numbers
// (LeetCode's API can't be queried from here, so numbers stay unverified) and no company tags.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LISTS = ["blind-75", "neetcode-150", "grind-169"] as const;
const repo = process.argv[2] ?? join(homedir(), "Software/Projects/pillow-references/faang");

const ROW = /^\|\s*([^|]+?)\s*\|\s*(Easy|Medium|Hard)\s*\|\s*https:\/\/leetcode\.com\/problems\/([a-z0-9-]+)\/\s*\|\s*([^|]+?)\s*\|/;

interface Entry { list: (typeof LISTS)[number]; section: string; topic: string }
interface Source { slug: string; title: string; difficulty: "Easy" | "Medium" | "Hard"; entries: Entry[] }

const bySlug = new Map<string, Source>();
for (const list of LISTS) {
  let section = "";
  for (const line of readFileSync(join(repo, "content", `${list}.md`), "utf8").split("\n")) {
    if (line.startsWith("## ")) { section = line.slice(3).trim(); continue; }
    const m = ROW.exec(line);
    if (!m) continue;
    const [, title, difficulty, slug, topic] = m;
    const s = bySlug.get(slug) ?? { slug, title, difficulty: difficulty as Source["difficulty"], entries: [] };
    if (s.difficulty !== difficulty) throw new Error(`${slug}: difficulty differs between lists`);
    if (s.entries.some((e) => e.list === list)) throw new Error(`${slug}: listed twice in ${list}`);
    s.entries.push({ list, section, topic });
    bySlug.set(slug, s);
  }
}

const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const license = readFileSync(join(repo, "LICENSE"), "utf8");
const out = {
  attribution: {
    source: "https://github.com/sumitsingh4411/faang",
    commit,
    license: "MIT",
    notice: license.split("\n").find((l) => l.startsWith("Copyright")) ?? "",
    lists: LISTS,
  },
  problems: [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
};
writeFileSync("src/curriculum/sources.json", JSON.stringify(out, null, 1) + "\n");
console.log(`${out.problems.length} problems from ${LISTS.join(", ")} @ ${commit.slice(0, 7)}`);
