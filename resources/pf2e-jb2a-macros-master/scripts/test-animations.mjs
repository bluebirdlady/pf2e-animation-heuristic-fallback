import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { error, setFailed } from '@actions/core';

const ANIMATIONS_DIR = 'animations';

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

async function validateAnimationFile(filePath) {
    const content = await readFile(filePath, 'utf-8');
    const json = JSON.parse(content);

    const errors = [];

    if (json.metaData == null || typeof json.metaData !== 'object') {
        errors.push(`Missing or invalid metaData object`);
    } else {
        if (typeof json.metaData.name !== 'string' || json.metaData.name.length === 0) {
            errors.push(`Missing or invalid metaData.name`);
        }
        if (typeof json.metaData.version !== 'number' || isNaN(json.metaData.version)) {
            errors.push(`Missing or invalid metaData.version`);
        }
    }

    if (json.label == null || typeof json.label !== 'string' || json.label.length === 0) {
        errors.push(`Missing or invalid label`);
    }

    if (json.menu == null || typeof json.menu !== 'string' || json.menu.length === 0) {
        errors.push(`Missing or invalid menu`);
    }

    return errors;
}

console.log(`Scanning ${ANIMATIONS_DIR}/ directory...`);

const files = await findJsonFiles(ANIMATIONS_DIR);
console.log(`Found ${files.length} animation files`);

if (files.length === 0) {
    error("No animation files found!");
    process.exit(1);
}

let passed = true;
let errorCount = 0;

for (const filePath of files) {
    const errors = await validateAnimationFile(filePath);
    if (errors.length > 0) {
        passed = false;
        errorCount++;
        const relativePath = filePath.replace(/^animations[\\\/]/, '');
        error(`Error in ${relativePath}:`);
        for (const err of errors) {
            error(`  - ${err}`);
        }
    }
}

if (passed) {
    console.log(`All ${files.length} animation files are valid.`);
    process.exit(0);
} else {
    setFailed(`${errorCount} out of ${files.length} files have validation errors.`);
    process.exit(1);
}
