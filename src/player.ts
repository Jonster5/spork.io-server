import { randomUUID } from 'crypto';
import { Component, ECS, Vec2 } from 'raxis';
import { Transform } from 'raxis-plugins';
import {
	SocketCloseEvent,
	SocketOpenEvent,
	encodeString,
	sendData,
	stitch,
} from 'raxis-server';
import { type WebSocket } from 'ws';
import { MinimapData } from './rendermap';
import { Inventory } from './inventory';
import { Tools } from './tools';
import { Health } from './health';
import { Flags } from './flags';

export class Player extends Component {
	constructor(public id: string, public socket: WebSocket) {
		super();
	}
}

function addPlayer(ecs: ECS) {
	ecs.getEventReader(SocketOpenEvent)
		.get()
		.forEach(({ handler, socket }) => {
			if (handler.path !== 'game') return;

			const id = randomUUID();
			const transform = new Transform(
				new Vec2(100, 100),
				Vec2.fromPolar(25000, Math.random() * Math.PI * 2)
			);
			const health = new Health(100);
			const inventory = new Inventory();
			const tools = new Tools();
			const flags = new Flags(false, 'wood');

			ecs.spawn(
				new Player(id, socket),
				transform,
				inventory,
				tools,
				health,
				flags
			);

			sendData(
				socket,
				'init',
				stitch(
					encodeString(id),
					Buffer.from(transform.serialize()),
					ecs.getResource(MinimapData).data,
					Buffer.from(health.serialize()),
					Buffer.from(inventory.serialize()),
					Buffer.from(tools.serialize()),
					Buffer.from(flags.serialize())
				)
			);
		});
}

function removePlayer(ecs: ECS) {
	ecs.getEventReader(SocketCloseEvent)
		.get()
		.forEach(({ handler, socket }) => {
			if (handler.path !== 'game') return;

			const playerEid = ecs
				.query([Player])
				.entities()
				.find((p) => ecs.entity(p).get(Player).socket === socket);

			if (playerEid === undefined) {
				return;
			}

			const playerEntity = ecs.entity(playerEid);

			handler.server.clients.forEach((c) => {
				sendData(c, 'leave', encodeString(playerEntity.get(Player).id));
			});

			ecs.destroy(playerEid);
		});
}

export function PlayerPlugin(ecs: ECS) {
	ecs.addComponentType(Player).addMainSystems(addPlayer, removePlayer);
}
