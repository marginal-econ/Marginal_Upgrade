import * as fs from "fs";
import * as path from "path";

const sqlFile = path.resolve(
  process.cwd(),
  "supabase/migrations/20260923220000_definition_topic_groups.sql",
);
const content = fs.readFileSync(sqlFile, "utf-8");

const regex = /\(\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*\)/g;
const definitions: Array<{
  id: string;
  term: string;
  definition_text: string;
  category: string;
  created_at: string;
}> = [];

let match: RegExpExecArray | null;
let idx = 1;
while ((match = regex.exec(content)) !== null) {
  const term = match[1].replace(/''/g, "'");
  const definition_text = match[2].replace(/''/g, "'");
  const category = match[3].replace(/''/g, "'");
  definitions.push({
    id: `def_${String(idx).padStart(4, "0")}`,
    term,
    definition_text,
    category,
    created_at: new Date().toISOString(),
  });
  idx++;
}

console.log(`Parsed ${definitions.length} master definitions from migration file.`);

const backupDir = path.resolve(process.cwd(), "backup");
fs.writeFileSync(path.join(backupDir, "definitions.json"), JSON.stringify(definitions, null, 2));
console.log(`Saved to ${path.join(backupDir, "definitions.json")}`);
