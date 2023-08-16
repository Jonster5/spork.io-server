import { Component, ECS } from 'raxis';

export class Inventory extends Component {
	wood: number = 0;
	stone: number = 0;
	food: number = 0;

	gold: number = 0;

	serialize(): ArrayBufferLike {
		return new Uint16Array([this.wood, this.stone, this.food, this.gold]).buffer;
	}
}

export function InventoryPlugin(ecs: ECS) {
	ecs.addComponentType(Inventory);
}
