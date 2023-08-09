import { transform } from 'esbuild';
import { ECS, With } from 'raxis';
import { Transform, checkTimer, setTimer } from 'raxis-plugins';
import { Inventory } from './inventory';
import { Player } from './player';
import { Flags } from './flags';
import map from './assets/map.json';
import { Tools } from './tools';

function gatherResources(ecs: ECS) {
	if (checkTimer(ecs)) return;
	ecs.query([Transform, Flags, Inventory, Tools], With(Player))
		.results()
		.forEach(([transform, flags, inventory, tools]) => {
			const gridPosition = transform.pos.clone().div(500).floor();
			if (
				!(
					gridPosition.x >= map.size[0] / 2 ||
					gridPosition.x < -map.size[0] / 2 ||
					gridPosition.y >= map.size[1] / 2 ||
					gridPosition.y < -map.size[1] / 2
				)
			) {
				if (
					flags.isClicking /* && Vec2.fromPolar(1)transform.angle).dot(new Vec2(gridPosition.x*500+250,gridPosition.y*500-250)) > 0.5 */
				) {
					if (
						flags.selectedTool === 'wood' &&
						map.object[gridPosition.x + map.size[0] / 2][
							gridPosition.y + map.size[1] / 2
						] == 2
					) {
						inventory.wood += 1 + tools.wood;
					}
					if (
						flags.selectedTool === 'stone' &&
						map.object[gridPosition.x + map.size[0] / 2][
							gridPosition.y + map.size[1] / 2
						] == 1
					) {
						inventory.stone += 1 + tools.stone;
					}
				}
			}
		});

	setTimer(ecs, 500);
}

export function GatheringPlugin(ecs: ECS) {
	ecs.addMainSystem(gatherResources);
}
