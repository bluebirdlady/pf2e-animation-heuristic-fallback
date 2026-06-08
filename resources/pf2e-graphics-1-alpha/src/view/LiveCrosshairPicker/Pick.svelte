<script lang='ts'>
	import type { ActorPF2e, EnrichmentOptionsPF2e } from 'foundry-pf2e';
	import type { Payload } from 'schema';
	import type { ExecutionContext } from 'src/payloads';
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';

	export let payload: Extract<Payload, { type: 'crosshair' }>;
	export let context: ExecutionContext;
	export let close: () => void;

	const seconds = 60_000; // 1 minute

	const tween = tweened(seconds, { duration: seconds });

	onMount(() => tween.set(0));

	$: if ($tween <= 0) setTimeout(() => close(), 750);

	const rollData: EnrichmentOptionsPF2e['rollData'] = {
		actor: context.sources[0].actor as ActorPF2e,
		item: context.item,
	};
</script>

<div class='pf2e-g' style:position='relative'>
	<main class='text-center p-1'>
		{#if payload.prompt?.text}
			{#await window.game.pf2e.TextEditor.enrichHTML(payload.prompt.text, { rollData }) then text}
				{@html text}
			{:catch error}
				{error}
			{/await}
		{:else}
			Pick a location for the <code>{payload.name}</code> animation!
		{/if}
		<p class='text-xs'>The selection times out after {seconds / 1000} seconds.</p>
	</main>
	<div class='w-full bg-gray-200 rounded-full dark:bg-gray-700'>
		<div
			class='
				{$tween > 0 ? 'bg-blue-800' : ''} rounded-full
					text-[0.6rem] font-medium text-blue-100 text-center leading-none
					p-0.5
				{$tween > 0 ? '' : 'transition-all duration-500'}
			'
			style:width={`${$tween > 0 ? ($tween / seconds * 100) : 100}%`}
		>
			{($tween / 1000).toFixed(1)}s
		</div>
	</div>
</div>
