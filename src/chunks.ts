import { Component, ECS, Resource, Vec2 } from 'raxis';
import {
	SocketMessageEvent,
	decodeString,
	encodeString,
	getServerPath,
	sendData,
	stitch,
	unstitch,
} from 'raxis-server';
import { Player } from './player';
import { Transform, checkTimer, setTimer } from 'raxis-plugins';
import map from './assets/map.json';

export class WorldData extends Resource {
	chunkData: ChunkData[][] = new Array(map.size[0])
		.fill(null)
		.map(() => new Array(map.size[1]).fill(null).map(() => new ChunkData()));
}

function makeBlock(type: BlockType, id: string) {
	return {
		type,
		id,
		health: (() => {
			switch (type) {
				default:
					return 100;
			}
		})(),
	};
}

export class ChunkData {
	blocks: { id: string; type: BlockType; health: number }[] = new Array(25);
	gen: bigint = 0n;

	serialize() {
		const blockBuffers: Buffer[] = [];

		for (let i = 0; i < this.blocks.length; i++) {
			if (this.blocks[i]) {
				const id = encodeString(this.blocks[i].id);
				const bt = Buffer.from(new Uint8Array([blockTypeToNumber(this.blocks[i].type)]).buffer);
				const bh = Buffer.from(new Uint16Array([this.blocks[i].health]).buffer);

				blockBuffers.push(stitch(id, bt, bh));
			} else {
				blockBuffers.push(stitch(Buffer.alloc(1)));
			}
		}

		return stitch(...blockBuffers);
	}
}

export type BlockType = `${'wall' | 'door' | 'spikes'}-${'wood' | 'stone' | 'reinforced'}`;

export function blockTypeToNumber(type: BlockType) {
	switch (type) {
		case 'wall-wood':
			return 0;
		case 'wall-stone':
			return 1;
		case 'wall-reinforced':
			return 2;
		case 'door-wood':
			return 3;
		case 'door-stone':
			return 4;
		case 'door-reinforced':
			return 5;
		case 'spikes-wood':
			return 6;
		case 'spikes-stone':
			return 7;
		case 'spikes-reinforced':
			return 8;
		default:
			return -1;
	}
}

export function blockNumberToType(num: number): BlockType | 'none' {
	switch (num) {
		case 0:
			return 'wall-wood';
		case 1:
			return 'wall-stone';
		case 2:
			return 'wall-reinforced';
		case 3:
			return 'door-wood';
		case 4:
			return 'door-stone';
		case 5:
			return 'door-reinforced';
		case 6:
			return 'spikes-wood';
		case 7:
			return 'spikes-stone';
		case 8:
			return 'spikes-reinforced';
		default:
			return 'none';
	}
}

function sendChunks(ecs: ECS) {
	if (checkTimer(ecs)) return;
	if (ecs.query([Player]).empty()) return;

	const players = ecs.query([Player, Transform]).results();
	const { chunkData } = ecs.getResource(WorldData);

	for (const [{ socket }, { pos }] of players) {
		const gridPos = pos.clone().div(500).floor();

		const chunks: Buffer[] = [];

		for (let y = gridPos.y - 5; y < gridPos.y + 5; y++) {
			for (let x = gridPos.x - 5; x < gridPos.x + 5; x++) {
				const coords = Buffer.from(new Int16Array([x, y]).buffer);
				const info = Buffer.from(
					new Uint16Array([
						map.biome[x + map.size[0] / 2][y + map.size[1] / 2] ?? 0,
						map.object[x + map.size[0] / 2][y + map.size[1] / 2] ?? 0,
					]).buffer
				);
				const gen = Buffer.from(
					new BigUint64Array([chunkData[x + map.size[0] / 2][y + map.size[1] / 2].gen]).buffer
				);
				const blocks = chunkData[x + map.size[0] / 2][y + map.size[1] / 2].serialize();

				chunks.push(stitch(coords, info, gen, blocks));
			}
		}
		sendData(socket, 'chunks', stitch(...chunks));
	}

	setTimer(ecs, 50);
}

function listenBlocks(ecs: ECS) {
	ecs.getEventReader(SocketMessageEvent)
		.get()
		.forEach((event) => {
			if (event.handler.path !== 'game' || event.type !== 'request-block-place') return;

			const dataRaw = unstitch(event.body);
			const pid = decodeString(dataRaw[0]);
			const requestLocation = Vec2.deserialize(
				dataRaw[1].buffer.slice(dataRaw[1].byteOffset, dataRaw[1].byteOffset + dataRaw[1].byteLength)
			);
			const requestBlocktype = blockNumberToType(new Uint8Array(dataRaw[2])[0]);
			if (requestBlocktype === 'none') return;

			const players = ecs.query([Player, Transform]).results();

			const chunkToUpdate = requestLocation.clone().div(500).floor();
			const { chunkData } = ecs.getResource(WorldData);
			const chunk = chunkData[chunkToUpdate.x + map.size[0] / 2][chunkToUpdate.y + map.size[1] / 2];

			const block = requestLocation
				.clone()
				.div(50)
				.map((x) => Math.abs(((x % 10) - 1) / 2));

			if (requestLocation.y >= 0) block.y = 4 - block.y;
			else block.y -= 1;
			if (requestLocation.x <= 0) block.x = 4 - block.x + 1;

			const index = block.x + block.y * 5;

			if (chunk.blocks[index] === undefined) {
				chunk.blocks[index] = makeBlock(requestBlocktype, pid);
				chunk.gen++;
			}
		});
}

export function ChunksPlugin(ecs: ECS) {
	ecs.insertResource(new WorldData());
	ecs.addMainSystems(sendChunks, listenBlocks);
}
