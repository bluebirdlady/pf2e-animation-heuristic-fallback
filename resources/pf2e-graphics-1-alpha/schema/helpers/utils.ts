/**
 * Reasonably accurately pluralises words.
 * @privateRemarks Duplicated from `scripts/` to avoid node-based dependencies, since this is also being run in a browser, Spappz.
 * @privateRemarks Spappz doesn't like this wasteful code inefficiency; please picture him folding his arms and harrumphing.
 * @param word The word to possibly pluralise.
 * @param count Triggers pluralisation when not equal to 1.
 * @returns The word pluralised or not accordingly.
 */
export function pluralise(word: string, count: number): string {
	if (count === 1) return word;
	if (word.endsWith('s')) return `${word}es`;
	if (word.endsWith('y')) return `${word.slice(0, -1)}ies`;
	return `${word}s`;
}

/**
 * Transforms an array of strings into a human-readable list.
 * @privateRemarks Oxford comma rules 😎
 * @param items An array of elements to be listed.
 * @param options An optional configuration object to control the list format.
 * @param options.conjunction The conjunction to use in the list (default: `"and"`).
 * @param options.style A formatting keyword. `none`: no formatting applied (default). `code`: wraps each item in backticks (e.g. "\`one\`, \`two\`, and \`three\`").
 * @returns A string containing a human-readable list of `items`.
 */
export function listify(
	items: string[],
	options: { conjunction?: 'and' | 'or'; style?: 'none' | 'code' } = { conjunction: 'and', style: 'none' },
): string {
	if (!options.conjunction) options.conjunction = 'and';
	if (!options.style) options.style = 'none';

	if (items.length === 0) return '';

	let format;
	if (options.style === 'code') {
		format = (str: string) => `\`${str}\``;
	} else {
		format = (str: string) => str;
	}

	if (items.length === 1) return format(items[0]);
	if (items.length === 2) return `${format(items[0])} ${options.conjunction} ${format(items[1])}`;

	const commaList = items
		.slice(0, -2)
		.map(str => format(str))
		.join(', ');
	return `${commaList}, ${options.conjunction} ${format(items[items.length - 1])}`;
}
