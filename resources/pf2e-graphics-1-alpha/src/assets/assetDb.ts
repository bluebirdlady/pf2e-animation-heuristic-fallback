export const DB_PREFIX = 'graphics-vfx';

// Start from 01
const p = 'modules/pf2e-graphics/assets/library/graphics';
export const database = {
	rpg: {
		accelerate: {
			file: `${p}/dreams-circle/animationscollection2_quantum/accelerate/accelerate.json`,
		},
		decelerate: {
			file: `${p}/dreams-circle/animationscollection2_quantum/decelerate/decelerate.json`,
		},
		black_hole: {
			file: `${p}/dreams-circle/animationscollection2_quantum/black_hole/black_hole.json`,
		},
		cleave: {
			file: `${p}/dreams-circle/animationscollection2_quantum/cleave/cleave.json`,
		},
		shot: {
			file: `${p}/dreams-circle/animationscollection2_quantum/shot/shot.json`,
		},
		slash: {
			file: `${p}/dreams-circle/animationscollection2_quantum/slash/slash.json`,
		},
		star_burst: {
			file: `${p}/dreams-circle/animationscollection2_quantum/star_burst/star_burst.json`,
		},
		stasis: {
			file: `${p}/dreams-circle/animationscollection2_quantum/stasis/stasis.json`,
		},
		chomp: {
			file: `${p}/dreams-circle/animationscollection_cursedkingdoms/chomp/chomp.json`,
		},
		gash: {
			file: `${p}/dreams-circle/animationscollection_cursedkingdoms/gash/gash.json`,
		},
		rip: {
			file: `${p}/dreams-circle/animationscollection_cursedkingdoms/rip/rip.json`,
		},
	},
} as const;
