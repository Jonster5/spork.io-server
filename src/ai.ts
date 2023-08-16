import { Component, ECS, Vec2, With, linear } from 'raxis';
import { Time, Transform, Tween, addTween, removeTween } from 'raxis-plugins';
import { NPC } from './npc';

export class PassiveAI extends Component {}

export class AICalm extends Component {
	constructor(public cooldown: number) {
		super();
	}
}

export class HostileAI extends Component {
	constructor() {
		super();
	}
}

function passiveAICalm(ecs: ECS) {
	const time = ecs.getResource(Time);
	const npcs = ecs.query([], With(AICalm), With(PassiveAI), With(NPC), With(Transform));
	if (npcs.empty()) return;

	for (const eid of npcs.entities()) {
		const entity = ecs.entity(eid);
		const ai = entity.get(AICalm);
		const tf = entity.get(Transform);

		ai.cooldown -= time.delta;
		if (ai.cooldown > 0) continue;

		addTween(entity, 'decel', new Tween(tf.vel, { x: 0, y: 0 }, 300, linear, () => removeTween(entity, 'decel')));
		const dir = Math.random() * 2 * Math.PI;
		addTween(entity, 'spin', new Tween(tf, { angle: dir }, 500)).onCompletion(() => {
			removeTween(entity, 'spin');
			if (Math.random() < 0.3) {
				addTween(
					entity,
					'accel',
					new Tween(tf.vel, Vec2.fromPolar(300, dir).toObject(), 500, linear, () => {
						removeTween(entity, 'accel');
					})
				);
			}
		});

		ai.cooldown = (Math.floor(Math.random() * 8) + 2) * 1000;
	}
}

export function AIPlugin(ecs: ECS) {
	ecs.addComponentTypes(PassiveAI, HostileAI, AICalm).addMainSystem(passiveAICalm);
}
