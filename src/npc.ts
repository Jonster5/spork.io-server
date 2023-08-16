import { Component, ECS, Vec2 } from 'raxis';
import { Transform } from 'raxis-plugins';
import crypto from 'crypto';
import { Health } from './health';
import { AICalm, PassiveAI } from './ai';
import { decodeString, encodeString, getServerPath, sendData, stitch, unstitch } from 'raxis-server';
import { Player } from './player';

export type NPCType = 'pig' | 'chicken';

export class NPC extends Component {
	nid: string = crypto.randomUUID();

	constructor(readonly type: NPCType) {
		super();
	}

	serialize(): ArrayBufferLike {
		return stitch(encodeString(this.nid), encodeString(this.type));
	}
}

export function generateNPCs(ecs: ECS) {
	for (let i = 0; i < 100; i++) {
		ecs.spawn(
			new PassiveAI(),
			new AICalm(Math.random() * 5000 + 3000),
			new NPC('pig'),
			new Transform(new Vec2(300, 200), Vec2.fromPolar(25000, Math.random() * Math.PI * 2)),
			new Health(100)
		);
	}

	for (let i = 0; i < 200; i++) {
		ecs.spawn(
			new PassiveAI(),
			new AICalm(Math.random() * 5000 + 3000),
			new NPC('chicken'),
			new Transform(new Vec2(100, 80), Vec2.fromPolar(25000, Math.random() * Math.PI * 2)),
			new Health(100)
		);
	}
}

export function updateClients(ecs: ECS) {
	ecs.query([Player, Transform])
		.results()
		.forEach(([{ socket }, { pos }]) => {
			const npcData = ecs
				.query([NPC, Transform, Health])
				.results()
				.filter(([, n]) => n.pos.distanceToSq(pos) < 5000 ** 2)
				.map(([n, t, h]) =>
					stitch(Buffer.from(n.serialize()), Buffer.from(t.serializeUnsafe()), Buffer.from(h.serialize()))
				);

			const packet = stitch(...npcData);
			sendData(socket, 'npc-update', packet);
		});
}

export function NPCPlugin(ecs: ECS) {
	ecs.addComponentType(NPC).addStartupSystem(generateNPCs).addMainSystem(updateClients);
}
