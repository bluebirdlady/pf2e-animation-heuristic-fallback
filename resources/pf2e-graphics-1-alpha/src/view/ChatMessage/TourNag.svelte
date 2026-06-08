<script lang='ts'>
	import type { ChatMessagePF2e } from 'foundry-pf2e';
	import { i18n, info } from 'src/utils';

	export let message: ChatMessagePF2e;
	const { unstartedTourConfigs } = message.flags['pf2e-graphics'] as {
		unstartedTourConfigs: TourConfig[];
	};

	function neverSpeakToMeAgain() {
		window.game.tours
			.keys()
			.filter(str => str.startsWith('pf2e-graphics.'))
			.forEach((tourName) => {
				const tour = window.game.tours.get(tourName) as Tour;
				if (tour.status === 'unstarted') tour.progress(0).then(() => tour.exit()); // Tour isn't completed, so don't complete it 😤
			});
		info('pf2e-graphics.messages.tourNag.farewellToast');
		message.delete();
	}

	function getTourDoc(tour: TourConfig) {
		return window.game.tours.get(`${tour.namespace}.${tour.id}`) as Tour;
	}
</script>

<div class='pf2e-g'>
	<h2>{@html i18n('pf2e-graphics.messages.tourNag.header')}</h2>

	<p class='text-justify'>{@html i18n('pf2e-graphics.messages.tourNag.body')}</p>
	<p class='text-lg'><b>{i18n('pf2e-graphics.messages.tourNag.doYouWantATour')}</b></p>

	<div class='mx-4 space-y-1'>
		{#each unstartedTourConfigs as tourConfig}
			{@const tour = getTourDoc(tourConfig)}
			<button
				class='flex flex-row items-center px-2'
				on:click={() => tour.start()}
				disabled={tour?.status !== 'unstarted'}
				class:line-through={tour?.status !== 'unstarted'}
			>
				<i class='fas fa-play fa-fw mx-auto'></i>
				<span class='grow'>{i18n(tourConfig.title)}</span>
			</button>
		{/each}
		<button
			class='flex flex-row items-center px-2'
			on:click={() => {
				// @ts-expect-error TODO: pending https://github.com/7H3LaughingMan/foundry-pf2e/pull/605
				new window.ToursManagement().render(true, { activeCategory: 'pf2e-graphics' });
			}}
		>
			<i class='fas fa-person-hiking fa-fw mx-auto'></i>
			<i class='grow'>{i18n('pf2e-graphics.messages.tourNag.buttons.seeAllTours')}</i>
		</button>
		<hr />
		<button class='flex flex-row items-center px-2' on:click={() => neverSpeakToMeAgain()}>
			<i class='fas fa-xmark fa-fw mx-auto'></i>
			<span class='grow'>
				<b>{i18n('pf2e-graphics.messages.tourNag.buttons.neverSpeakToMeAgain')}</b>
			</span>
		</button>
	</div>
</div>
