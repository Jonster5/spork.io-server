import { Component, ECS, Vec2 } from 'raxis';
import { Transform } from 'raxis-plugins';
import crypto from 'crypto';
import { Health } from './health';

export type NPCType = 'pig' | 'chicken';

export class NPC extends Component {
	id: string = crypto.randomUUID();

	constructor(public type: NPCType) {
		super();
	}
}

export function generateNPCs(ecs: ECS) {
	ecs.spawn(new NPC('pig'), new Transform(new Vec2(100, 200)), new Health(100));
}

export function NPCPlugin(ecs: ECS) {
	ecs.addComponentType(NPC);
}
