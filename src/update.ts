import { ECS, ECSEvent, Vec2, With } from 'raxis';
import { Player } from './player';
import {
	SocketMessageEvent,
	decodeString,
	encodeString,
	getServerPath,
	sendData,
	stitch,
	unstitch,
} from 'raxis-server';
import { Transform, checkTimer, setTimer } from 'raxis-plugins';
import { Inventory } from './inventory';
import { Tools } from './tools';
import map from './assets/map.json';
import { Flags } from './flags';

function recieveFromPlayers(ecs: ECS) {
	const players = ecs
		.query([], With(Player))
		.entities()
		.map((e) => ecs.entity(e));

	ecs.getEventReader(SocketMessageEvent)
		.get()
		.forEach(({ handler, type, body }) => {
			if (handler.path !== 'game' || type !== 'update') return;

			const data = unstitch(body);
			const id = decodeString(data[0]);
			const transform = Transform.deserialize(
				data[1].buffer.slice(
					data[1].byteOffset,
					data[1].byteOffset + data[1].byteLength
				)
			);
			const flags = Flags.deserialize(
				data[2].buffer.slice(
					data[2].byteOffset,
					data[2].byteOffset + data[2].byteLength
				)
			);

			const player = players.find((p) => p.get(Player).id === id);
			if (!player) {
				return;
			}

			player.replace(transform);
			player.replace(flags);
		});
}

function sendToPlayers(ecs: ECS) {
	const update = stitch(
		...ecs
			.query([Player, Transform, Inventory, Tools, Flags])
			.results(([{ id }, transform, inventory, tools, flags]) => {
				// console.log(inventory.wood, inventory.stone);

				return stitch(
					encodeString(id),
					Buffer.from(transform.serialize()),
					Buffer.from(inventory.serialize()),
					Buffer.from(tools.serialize()),
					Buffer.from(flags.serialize())
				);
			})
	);

	getServerPath(ecs, 'game').server.clients.forEach((socket) => {
		sendData(socket, 'update', update);
	});
}

export function UpdatePlugin(ecs: ECS) {
	ecs.addMainSystems(sendToPlayers, recieveFromPlayers);
}
