import fs from "fs";
import path from "path";

function walk(dir: string): string[] {
  let results: string[] = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

const tableSet = new Set<string>();
const files = walk("src");

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const regex = /\.from\((['"])([a-zA-Z0-9_]+)\1\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    tableSet.add(match[2]);
  }
}

console.log("Tables referenced in src/:");
console.log(Array.from(tableSet).sort());
