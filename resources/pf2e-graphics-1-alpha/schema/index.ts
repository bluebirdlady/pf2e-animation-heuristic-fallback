import type { AnimationSetsObject } from './payload';
import type { TokenImagesObject } from './tokenImages';

/**
 * The complete, merged `animations/` data available to *PF2e Graphics*, as encoded in JSON. This includes both animation sets and token-image data.
 */
export type ModuleDataObject = AnimationSetsObject & TokenImagesObject;

/**
 * The complete, merged `animations/` data available to *PF2e Graphics*, as encoded in JSON, but represented as a `Map`. This includes both animation sets and token-image data.
 */
export type ModuleDataMap = Map<
	keyof (AnimationSetsObject & TokenImagesObject),
	ValueOf<AnimationSetsObject | TokenImagesObject>
>;

// #region Relayed exports
export {
	animationSetDocument,
	type AnimationSetDocument,
	moduleAnimationSetDocument,
	type ModuleAnimationSetDocument,
	userAnimationSetDocument,
	type UserAnimationSetDocument,
	worldAnimationSetDocument,
	type WorldAnimationSetDocument,
} from './document';
export {
	type AnimationSet,
	type AnimationSetContentsItem,
	animationSets,
	type AnimationSetsObject,
	animationSetsObject,
	animationSetsObjectValue,
	type Payload,
} from './payload';
export { type PayloadType, payloadTypeList, payloadTypes } from './payloads';
export { type TokenImage, tokenImagesObject } from './tokenImages';
export { type Trigger, triggerList } from './triggers';
// #endregion
