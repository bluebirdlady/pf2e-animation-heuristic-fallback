import type { ExecutionContext } from '.';
import type { Payload } from '../../schema';
import { addCustomExecutionContext, parseMinMaxObject, positionToArgument } from '.';
import { AnimCore } from '../storage/AnimCore';

export function executeSound(payload: Extract<Payload, { type: 'sound' }>, context: ExecutionContext): Sequence {
	const seq = new Sequence();

	context = addCustomExecutionContext(payload.sources, payload.targets, context);

	seq.addSequence(processSound(payload, context));

	return seq;
}

function processSound(payload: Parameters<typeof executeSound>[0], context: ExecutionContext): SoundSection {
	const seq = new Sequence().sound().file(AnimCore.parseFiles(payload.sound));

	if (context.label) seq.name(context.label);

	if (payload.position) {
		seq.atLocation(positionToArgument(payload.position.location, context), {
			// offset: offsetToVector2(payload.position.offset), TODO: STILL WAIT FOR THIS TO GET MERGED https://github.com/fantasycalendar/FoundryVTT-Sequencer/pull/388
			randomOffset: payload.position.randomOffset ?? 0,
			gridUnits: payload.position.gridUnits ?? false,
		});
	}

	// @ts-expect-error TODO: Sequencer types
	if (payload.syncGroup) seq.syncGroup(payload.syncGroup);

	// @ts-expect-error TODO: Sequencer types
	if (payload.users) seq.forUsers(payload.users);

	if (payload.volume) seq.volume(payload.volume * window.pf2eGraphics.liveSettings.volume);

	if (payload.waitUntilFinished) seq.waitUntilFinished(...parseMinMaxObject(payload.waitUntilFinished));

	if (payload.repeats) {
		seq.repeats(payload.repeats.count, ...parseMinMaxObject(payload.repeats.delay ?? 0));
		if (payload.repeats.async) seq.async();
	}

	if (payload.duration) seq.duration(payload.duration);
	if (payload.probability) seq.playIf(() => Math.random() < payload.probability!);
	if (payload.delay) seq.delay(...parseMinMaxObject(payload.delay));
	if (payload.fadeIn) seq.fadeInAudio(payload.fadeIn.duration, payload.fadeIn);
	if (payload.fadeOut) seq.fadeOutAudio(payload.fadeOut.duration, payload.fadeOut);
	if (payload.radius) seq.radius(payload.radius);
	if (payload.constrainedByWalls) seq.constrainedByWalls(payload.constrainedByWalls);
	if (payload.noDistanceEasing) seq.distanceEasing(!payload.noDistanceEasing);
	if (payload.muffledEffect) seq.muffledEffect(payload.muffledEffect);
	if (payload.baseEffect) seq.baseEffect(payload.baseEffect);
	if (payload.alwaysForGMs) seq.alwaysForGMs(payload.alwaysForGMs);
	if (payload.audioChannel) seq.audioChannel(payload.audioChannel);

	return seq;
}
