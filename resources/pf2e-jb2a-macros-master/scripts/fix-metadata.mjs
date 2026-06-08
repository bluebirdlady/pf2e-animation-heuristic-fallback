import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';

const ANIMATIONS_DIR = 'animations';
const PACKAGE_JSON_PATH = 'package.json';

async function findJsonFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            const subFiles = await findJsonFiles(fullPath);
            files.push(...subFiles);
        } else if (entry.isFile() && extname(entry.name) === '.json') {
            files.push(fullPath);
        }
    }
    return files;
}

const packageJsonContent = await readFile(PACKAGE_JSON_PATH, 'utf-8');
const packageJson = JSON.parse(packageJsonContent);
const moduleVersion = packageJson.version;

console.log(`Module version from package.json: ${moduleVersion}`);

const files = await findJsonFiles(ANIMATIONS_DIR);
console.log(`Found ${files.length} animation files`);

let fixed = 0;
let skipped = 0;

for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8');
    const json = JSON.parse(content);

    if (json.metaData !== undefined) {
        if (typeof json.metaData.version === 'number' && json.metaData.name === "PF2e Animations") {
            skipped++;
            continue;
        }
    }

    json.metaData = {
        name: "PF2e Animations",
        moduleVersion,
        version: Number(moduleVersion.replaceAll(".", "")), // Technically wrong but we only need a "what is latest" comparison which this will do regardless
        label: json.label,
        menu: json.menu
    };

    await writeFile(filePath, JSON.stringify(json, null, 4) + '\n', 'utf-8');
    fixed++;
    const relativePath = filePath.replace(/^animations[\\\/]/, '');
    console.log(`Fixed: ${relativePath}`);
}

console.log(`\nSummary:`);
console.log(`  Fixed: ${fixed}`);
console.log(`  Skipped (already has metaData): ${skipped}`);

