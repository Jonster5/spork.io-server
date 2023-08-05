import { ECS, With } from 'raxis';
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
import { Transform } from 'raxis-plugins';
import { Inventory } from './inventory';
import { Tools } from './tools';

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

			const player = players.find((p) => p.get(Player).id === id);
			if (!player) {
				return;
			}

			player.replace(transform);
		});
}

function sendToPlayers(ecs: ECS) {
	const update = stitch(
		...ecs
			.query([Player, Transform, Inventory, Tools])
			.results(([pl, tf, iv, tl]) =>
				stitch(
					encodeString(pl.id),
					Buffer.from(tf.serialize()),
					Buffer.from(iv.serialize()),
					Buffer.from(tl.serialize())
				)
			)
	);

	getServerPath(ecs, 'game').server.clients.forEach((socket) => {
		sendData(socket, 'update', update);
	});
}

export function UpdatePlugin(ecs: ECS) {
	ecs.addMainSystems(sendToPlayers, recieveFromPlayers);
}
