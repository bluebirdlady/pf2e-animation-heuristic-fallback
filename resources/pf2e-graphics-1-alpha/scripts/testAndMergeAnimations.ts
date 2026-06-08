import type { ModuleDataMap } from '../schema/index.ts';
import type { AnimationSet, AnimationSetsObject } from '../schema/payload.ts';
import type { FileValidationFailure } from './helpers.ts';
import * as fs from 'node:fs';
import { validateAnimationData } from '../schema/validation/index.ts';
import { pluralise, safeJSONParse, testFilesRecursively } from './helpers.ts';

/**
 * A utility class that handles the merging of new animation-set data files and tracking the references therein.
 */
class DataMergeManager {
	/** A tracker for roll options that have been referenced by animation sets. It is represented by a `Map` of roll options (`string`) to a `Set` of filenames (`string`) that reference that roll option. */
	referencedRollOptions: Map<string, Set<string>>;

	/** A tracker for roll options that have data attached, including their partial forms (e.g. `item` and `item:group` from `item:group:sword`) */
	existentRollOptions: Set<string>;

	/** A buildable `Map` representing the module's data, as it would be encoded in JSON. */
	mergedModuleDataMap: ModuleDataMap;

	constructor() {
		this.referencedRollOptions = new Map();
		this.existentRollOptions = new Set();
		this.mergedModuleDataMap = new Map();
	}

	private getRollOptionFamily(rollOption: string): string[] {
		const slugs = rollOption.split(':');
		const rollOptionFamily = [];
		for (let i = 1; i <= slugs.length; i++) {
			rollOptionFamily.push(slugs.slice(0, i).join(':'));
		}
		return rollOptionFamily;
	}

	private addReferencedRollOption(rollOption: string, file: string): void {
		if (this.referencedRollOptions.has(rollOption)) {
			this.referencedRollOptions.get(rollOption)!.add(file);
		} else {
			this.referencedRollOptions.set(rollOption, new Set([file]));
		}
	}

	/**
	 * Merges a roll option and its associated animation sets/reference into the data-merge manager. References and roll options are noted appropriately for later inspection.
	 * @param file The data file being merged (for issue-tracking).
	 * @param rollOption The roll option associated with the animation sets.
	 * @param animationSets The animation sets (or reference to another roll option) to be merged.
	 */
	mergeAnimationSets(file: string, rollOption: string, animationSets: string | AnimationSet[]): void {
		// Do the merge
		this.mergedModuleDataMap.set(rollOption, animationSets);

		// Note each 'family member' of the roll option (e.g. `"item:group"` within `"item:group:sword"`)
		for (const rollOptionFamilyMember of this.getRollOptionFamily(rollOption)) {
			this.existentRollOptions.add(rollOptionFamilyMember);
		}

		// Populate references
		if (typeof animationSets === 'string') {
			this.addReferencedRollOption(rollOption, file);
		} else {
			for (const animationSet of animationSets) {
				if (animationSet.reference) this.addReferencedRollOption(animationSet.reference, file);
				for (const override of animationSet.overrides ?? []) {
					this.addReferencedRollOption(override, file);
				}
			}
		}
	}
}

/**
 * Tests animation JSONs, and then returns a merged object along with any validation errors encountered.
 *
 * @param targetPath - The path of the animation JSON(s). If the path is a directory, all files within it recursively are tested and merged.
 * @returns An object.
 */
export function testAndMergeAnimations(
	targetPath: string,
):
	| { success: true; data?: ModuleDataMap }
	| { success: false; data?: ModuleDataMap; issues: FileValidationFailure[] } {
	const dataMergeManager = new DataMergeManager();

	const results = testFilesRecursively(
		targetPath,
		{
			'.json': (file) => {
				// Test filename
				if (
					!file.match(
						/animations[\\/](?:(?:[a-z0-9-]+[\\/])+[a-z0-9]+(?:-[a-z0-9]+)*|tokenImages)\.json$/,
					)
				) {
					return { file, success: false, message: 'Invalid filename.' };
				}

				// Test readability
				const json = safeJSONParse(fs.readFileSync(file, { encoding: 'utf8' }));
				if (!json.success) return { file, success: false, message: 'Invalid JSON syntax.' };

				// Validate schema
				const schemaResult = validateAnimationData(json.data);

				// We don't return early on validation-failure, because we still want to bundle bad data for testing!

				// Test whether the data is an object and is therefore mergeable
				if (typeof json.data === 'object' && json.data !== null && !Array.isArray(json.data)) {
					const animationSetsObject = json.data as AnimationSetsObject;
					for (const rollOption in animationSetsObject) {
						// Test for duplicate keys
						if (dataMergeManager.mergedModuleDataMap.has(rollOption)) {
							return {
								file,
								success: false,
								message: `Animation set assigned to roll option \`${rollOption}\` elsewhere.`,
							};
						}
						dataMergeManager.mergeAnimationSets(file, rollOption, animationSetsObject[rollOption]);
					}
				}

				if (schemaResult.success) return { file, success: true };
				return {
					file,
					success: false,
					message: `${schemaResult.error.issues.length} schema ${pluralise('issue', schemaResult.error.issues.length)}.`,
					issues: schemaResult.error.issues,
				};
			},
			'default': false,
		},
		{ ignoreGit: true },
	);

	const issues = results.filter(result => !result.success);

	// Test references
	dataMergeManager.referencedRollOptions.forEach((files, rollOption) => {
		if (!dataMergeManager.existentRollOptions.has(rollOption)) {
			for (const file of files) {
				issues.push({
					file,
					success: false,
					message: `Couldn't find referenced roll option \`${rollOption}\`.`,
				});
			}
		}
	});

	if (issues.length) return { success: false, data: dataMergeManager.mergedModuleDataMap, issues };

	return { success: true, data: dataMergeManager.mergedModuleDataMap };
}
