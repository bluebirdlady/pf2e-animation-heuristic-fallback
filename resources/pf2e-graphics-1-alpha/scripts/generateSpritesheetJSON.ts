#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';

interface Frame {
	frame: {
		x: number;
		y: number;
		w: number;
		h: number;
	};
	rotated: boolean;
	trimmed: boolean;
	spriteSourceSize: {
		x: number;
		y: number;
		w: number;
		h: number;
	};
	sourceSize: {
		w: number;
		h: number;
	};
}

interface SpritesheetJSON {
	frames: { [key: string]: Frame };
	animations: { [key: string]: string[] };
	meta: {
		frameRate: number;
		image: string;
		format: string;
		size: { w: number; h: number };
		scale: string;
	};
}

const args = process.argv.slice(2);
if (args.length !== 6) {
	console.error(
		'Usage: generateSpritesheetJSON.ts <name> <imageWidth> <imageHeight> <gridWidth> <gridHeight> <frameCount>',
	);
	process.exit(1);
}

const [name, imageWidth, imageHeight, gridWidth, gridHeight, frameCount] = args;

const frames: { [key: string]: Frame } = {};
const animations: { [key: string]: string[] } = {};
const frameNames: string[] = [];

// Calculate number of frames that can fit in a row
const framesPerRow = Math.floor(Number(imageWidth) / Number(gridWidth));

for (let i = 0; i < Number(frameCount); i++) {
	const frameName = `${name}-${i}`;
	frameNames.push(frameName);

	// Calculate position in spritesheet
	const row = Math.floor(i / framesPerRow);
	const col = i % framesPerRow;

	frames[frameName] = {
		frame: {
			x: col * Number(gridWidth),
			y: row * Number(gridHeight),
			w: Number(gridWidth),
			h: Number(gridHeight),
		},
		rotated: false,
		trimmed: false,
		spriteSourceSize: {
			x: 0,
			y: 0,
			w: Number(gridWidth),
			h: Number(gridHeight),
		},
		sourceSize: {
			w: Number(gridWidth),
			h: Number(gridHeight),
		},
	};
}

animations[name] = frameNames;

const spritesheet: SpritesheetJSON = {
	meta: {
		frameRate: 60,
		image: `${name}.webp`,
		format: 'RGBA8888',
		size: {
			w: Number(imageWidth),
			h: Number(imageHeight),
		},
		scale: '1',
	},
	frames,
	animations,
};

// Write to file
fs.writeFileSync(path.join(process.cwd(), `${name}.json`), JSON.stringify(spritesheet, null, '\t'));

console.log(`Generated spritesheet JSON for ${name}`);
