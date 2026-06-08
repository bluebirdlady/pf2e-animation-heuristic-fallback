<svelte:options accessors={true} />

<script lang='ts'>
	import type { Content } from 'svelte-jsoneditor';
	import type { BasicAppExternal } from './AnimationDocumentApp';
	import { ApplicationShell } from '#runtime/svelte/component/application';
	import { clearEmpties, devLog } from 'src/utils';
	import { getContext } from 'svelte';
	import JsonEditor from '../_components/JSONEditor.svelte';
	import EditorShell from './EditorShell.svelte';

	export let elementRoot: HTMLElement;
	const { application } = getContext<BasicAppExternal>('#external');
	let animation = application.options.animation;
	$: json = clearEmpties(foundry.utils.deepClone(animation));

	function onChange(content: Content) {
		devLog('JSONEditor OnChange:', content);
		if ('json' in content) {
			animation = clearEmpties(content.json as typeof animation);
			application.save(animation);
		} else if ('text' in content) {
			const json = clearEmpties(JSON.parse(content.text));
			devLog('Parsed JSON:', json);
			animation = json;
			application.save(animation);
		}
	}
</script>

<ApplicationShell bind:elementRoot>
	<div class='flex flex-col overflow-hidden p-3'>
		<header class='grow-0'>
			<nav class='flex'>
				<button
					on:click={() => application.options.tab = 'main'}
					class:underline={application.options.tab === 'main'}
					class='
						p-2 -my-2 leading-4
						bg-transparent border-0
						underline-offset-2 decoration-red-700
						hover:shadow-none
						hover:underline hover:decoration-red-800 hover:decoration-dashed
					'>
					Main
				</button>
				<button
					on:click={() => application.options.tab = 'json'}
					class:underline={application.options.tab === 'json'}
					class='
						p-2 -my-2 leading-4
						bg-transparent border-0
						underline-offset-2 decoration-red-700
						hover:shadow-none
						hover:underline hover:decoration-red-800 hover:decoration-dashed
					'>
					Raw Data
				</button>
			</nav>
			<hr />
		</header>
		<main class='grow overflow-y-auto'>
			{#if application.options.tab === 'main'}
				<EditorShell bind:animation readonly={application.options.readonly} />
			{:else if application.options.tab === 'json'}
				<JsonEditor
					{json}
					{onChange}
				/>
			{/if}
		</main>
		<footer class='flex gap-1 grow-0 pt-2'>
			{#if !application.options.readonly}
				<button on:click={() => application.save(animation)}>
					Save
				</button>
				<button on:click={() => {
					application.save(animation);
					application.close({ dontSave: true });
				}}>
					Save and Close
				</button>
			{/if}
		</footer>
	</div>
</ApplicationShell>
