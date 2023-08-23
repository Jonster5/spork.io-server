import { Component, ECS, Vec2 } from 'raxis';
import { Transform } from 'raxis-plugins';
import crypto from 'crypto';
import { Health } from './health';
import { AICalm, PassiveAI } from './ai';
import { decodeString, encodeString, getServerPath, sendData, stitch, unstitch } from 'raxis-server';
import { Player } from './player';
import map from './assets/map.json'

export type NPCType = 'pig' | 'chicken' | 'scorpion';

export class NPC extends Component {
	nid: string = crypto.randomUUID();

	constructor(readonly type: NPCType) {
		super();
	}

	serialize(): ArrayBufferLike {
		return stitch(encodeString(this.nid), encodeString(this.type));
	}
}

function findBiome(targets: number[]) {
	let tries = 0;
	while (tries < 1000) {
		let pos = new Vec2(Math.floor(Math.random() * map.size[0]), Math.floor(Math.random() * map.size[1]))
		for (let target of targets) {
			if (map.biome[pos.x][pos.y] === target) {
				return pos.mul(500).sub(new Vec2(map.size[0]*250, map.size[1]*250))
			}
		}
		tries++;
	}
	return Vec2.fromPolar(25000, Math.random() * Math.PI * 2)
}

export function generateNPCs(ecs: ECS) {
	for (let i = 0; i < 100; i++) {
		ecs.spawn(
			new PassiveAI(),
			new AICalm(Math.random() * 5000 + 3000),
			new NPC('pig'),
			new Transform(new Vec2(300, 200), findBiome([0, 1])),
			new Health(100)
		);
	}

	for (let i = 0; i < 200; i++) {
		ecs.spawn(
			new PassiveAI(),
			new AICalm(Math.random() * 5000 + 3000),
			new NPC('chicken'),
			new Transform(new Vec2(100, 80), findBiome([0, 1])),
			new Health(100)
		);
	}

	for (let i = 0; i < 100; i++) {
		ecs.spawn(
			new PassiveAI(),
			new AICalm(Math.random() * 5000 + 3000),
			new NPC('scorpion'),
			new Transform(new Vec2(100, 80), findBiome([2])),
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
