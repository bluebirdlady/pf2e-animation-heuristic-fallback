import { DB_PREFIX as assetDbPrefix, database as videoDb } from './assetDb';
import { database as soundDb, DB_PREFIX as soundDbPrefix } from './soundDb';

Hooks.once('sequencerReady', () => {
	Sequencer.Database.registerEntries(soundDbPrefix, soundDb);
	Sequencer.Database.registerEntries(assetDbPrefix, videoDb);
});

if (import.meta.hot) {
	// Prevents reloads
	import.meta.hot.accept();

	if (window.Sequencer) {
		Sequencer.Database.registerEntries(soundDbPrefix, soundDb, false, true);
		Sequencer.Database.registerEntries(assetDbPrefix, videoDb, false, true);
	}
}
