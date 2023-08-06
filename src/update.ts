import { ECS, Vec2, With } from 'raxis';
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
import map from './assets/map.json'

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
			const flags = data[2];

			const player = players.find((p) => p.get(Player).id === id);
			if (!player) {
				return;
			}

			const gridPosition = transform.pos.clone().div(500).floor()
			if (!(gridPosition.x >= map.size[0]/2 || gridPosition.x < -map.size[0]/2 || gridPosition.y >= map.size[1]/2 || gridPosition.y < -map.size[1]/2)) {
                if (flags.readUint8(0)) {
					console.log(player.get(Inventory).stone, player.get(Inventory).wood)
					if (map.object[gridPosition.x + map.size[0]/2][gridPosition.y + map.size[1]/2] == 2) {
						player.get(Inventory).wood += 1
					}
					if (map.object[gridPosition.x + map.size[0]/2][gridPosition.y + map.size[1]/2] == 1) {
						player.get(Inventory).stone += 1
					}
				}
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
