import { Component, ECS } from 'raxis';

export class Tools extends Component {
	gathering: number = 0;
	melee: number = 0;
	projectile: number = 0;

	serialize(): ArrayBufferLike {
		return new Uint8Array([this.gathering, this.melee, this.projectile])
			.buffer;
	}
}

export function ToolsPlugin(ecs: ECS) {
	ecs.addComponentType(Tools);
}
