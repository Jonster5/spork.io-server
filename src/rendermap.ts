import { ECS, Resource } from 'raxis';
import map from './assets/map.json'

export class MinimapData extends Resource{
    constructor(
        public data: Buffer
    ) {
            super();
    }
}

function renderMap(ecs: ECS) {
    const biomes = map.biome
    const bufferdata = Buffer.alloc(map.size[0] * map.size[1] + 4)

    bufferdata.writeUInt16LE(map.size[0], 0)
    bufferdata.writeUInt16LE(map.size[1], 2)

    biomes.forEach((row, i) => {
        row.forEach((cell, j) => {
            bufferdata.writeUint8(cell, 4 + i + (map.size[1]-1-j) * map.size[0])
        });
    });

    ecs.insertResource(new MinimapData(bufferdata))
}

export function MapPlugin(ecs: ECS) {
    ecs.addStartupSystem(renderMap)
}