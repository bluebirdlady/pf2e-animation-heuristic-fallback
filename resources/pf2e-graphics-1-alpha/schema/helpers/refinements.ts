import { z } from 'zod';
import { listify, pluralise } from './utils';

/**
 * Zod refinement to ensure a numeric value isn't zero.
 */
export const nonZero: [(num: number) => boolean, string] = [
	num => num !== 0,
	'Number cannot be 0. If you want the value to be 0, simply leave the property undefined.',
];

/**
 * Zod refinement to ensure an object has at least one property.
 */
export const nonEmpty = minimumProperties(1);

/**
 * Generator for a Zod refinement that ensures an object has at least `minimum` properties.
 */
export function minimumProperties(minimum: number): [(obj: object) => boolean, string] {
	return [
		(obj) => {
			let count = 0;
			for (const _key in obj) {
				if (++count === minimum) return true;
			}
			return false;
		},
		`Object must have at least ${minimum} ${pluralise('property', minimum)}.`,
	];
}

/**
 * Generator for a Zod refinement that ensures an array has at least `minimum` unique elements.
 */
export function minimumUniqueItems(minimum: number): [(arr: any[]) => boolean, string] {
	return [
		(arr: any[]) => new Set(arr.map(e => JSON.stringify(e))).size >= minimum,
		`At least ${minimum} items must be unique.`,
	];
}

/**
 * Zod refinement to ensure an array has no duplicate elements (not perfect, but good enough).
 */
export const uniqueItems: [(arr: any[]) => boolean, string] = [
	arr => new Set(arr.map(e => JSON.stringify(e))).size === arr.length,
	'Items must be unique.',
];

/**
 * Subroutine for a Zod super-refinement that ensures a property only appears in conjunction with another property.
 * @param dependentKeys A list of optional string properties that require at least one of `requiredKeys` to be defined.
 * @param requiredKeys A set of string properties.
 * @param obj The object to be tested.
 * @returns A Zod `IssueData` object which can be used with `ctx.addIssue()`, or `void`.
 */
export function propertyDependencies<T extends object>(
	dependentKeys: Extract<keyof T, string>[],
	requiredKeys: Extract<keyof T, string>[],
	obj: T,
): Omit<z.ZodUnrecognizedKeysIssue, 'path'> | void {
	if (requiredKeys.some(key => key in obj)) return;

	const presentDependentKeys = dependentKeys.filter(key => key in obj);
	if (presentDependentKeys.length) {
		return {
			code: z.ZodIssueCode.unrecognized_keys,
			keys: presentDependentKeys,
			message: `${listify(presentDependentKeys, { style: 'code' })} ${pluralise('require', 1 - presentDependentKeys.length)} ${requiredKeys.length > 1 ? 'at least one of ' : ''}${listify(requiredKeys, { conjunction: 'or', style: 'code' })} to be defined`,
		};
	}
}
