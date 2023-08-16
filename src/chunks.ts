import { Component, ECS, Resource, Vec2 } from "raxis";
import { SocketMessageEvent, decodeString, encodeString, getServerPath, sendData, stitch, unstitch } from "raxis-server";
import { Player } from "./player";
import { Transform } from "raxis-plugins";
import map from './assets/map.json'

export class WorldData extends Resource {
    constructor(public blockData: BlockData[][] = Array(map.size[1]).fill(null).map(() => Array(map.size[0]).fill(null).map(() => new BlockData()))) {
        super();
    }
}

export class BlockData extends Component {
    constructor(public blocks: Uint8Array = new Uint8Array(25)) {
        super();
    }
}

function listenChunks(ecs: ECS) {
    ecs.getEventReader(SocketMessageEvent).get().forEach((event) => {
        if (event.handler.path !== 'game' || event.type !== 'chunks') return

        const dataRaw = unstitch(event.body)
        const targetUUID = decodeString(dataRaw[0])

        const players = ecs.query([Player, Transform]).results()
        const chunksPermitted = []
        const worldData = ecs.getResource(WorldData)

        for (let [player, transform] of players) {
            if (player.id === targetUUID) {
                const gridPosition = transform.pos.clone().div(500).floor()

                for (let i = 0; i < dataRaw[1].byteLength/4; i++) {
                    if (Math.abs(dataRaw[1].readInt16LE(i * 4)  - gridPosition.x) <= 5  && Math.abs(dataRaw[1].readInt16LE(i * 4 + 2) - gridPosition.y) <= 5) {
                        chunksPermitted.push([dataRaw[1].readInt16LE(i * 4) , dataRaw[1].readInt16LE(i * 4 + 2)])
                    }
                }
                
                break;
            }
        }

        const permitChunkBuffer = Buffer.alloc(6 * chunksPermitted.length)
        const chunkCoordsBuffer = Buffer.alloc(4 * chunksPermitted.length)
        const blocksBuffer = Buffer.alloc( 25 * chunksPermitted.length)
        chunksPermitted.forEach((chunk, i) => {
            if (chunk[0] >= map.size[0]/2 || chunk[0] < -map.size[0]/2 || chunk[1] >= map.size[1]/2 || chunk[1] < -map.size[1]/2) {
                permitChunkBuffer.writeUint8(4, i)
            } else {
                permitChunkBuffer.writeUint8(map.biome[chunk[0]+map.size[0]/2][chunk[1]+map.size[1]/2], i)
            }
        })

        chunksPermitted.forEach((chunk, i) => {
            if (chunk[0] >= map.size[0]/2 || chunk[0] < -map.size[0]/2 || chunk[1] >= map.size[1]/2 || chunk[1] < -map.size[1]/2) {
                permitChunkBuffer.writeUint8(0, i + chunksPermitted.length)
            } else {
                permitChunkBuffer.writeUint8(map.object[chunk[0]+map.size[0]/2][chunk[1]+map.size[1]/2], i + chunksPermitted.length)
            }
            blocksBuffer.fill(worldData.blockData[chunk[0]+map.size[0]/2][chunk[1]+map.size[1]/2].blocks, i * 25)
        })
        
        chunksPermitted.forEach((chunk, i) => {
            permitChunkBuffer.writeInt16LE(chunk[0], i*4 + 0 + 2 * chunksPermitted.length)
            permitChunkBuffer.writeInt16LE(chunk[1], i*4 + 2 + 2 * chunksPermitted.length)
            chunkCoordsBuffer.writeInt16LE(chunk[0], i*4 + 0)
            chunkCoordsBuffer.writeInt16LE(chunk[1], i*4 + 2)
        })
        
        sendData(event.socket, 'chunks-permitted', stitch(permitChunkBuffer, chunkCoordsBuffer, blocksBuffer))
    })
}

function listenBlocks(ecs: ECS) {
    ecs.getEventReader(SocketMessageEvent).get().forEach((event) => {
        if (event.handler.path !== 'game' || event.type !== 'request-block-place') return

        const dataRaw = unstitch(event.body)
        const targetUUID = decodeString(dataRaw[0])
        const requestLocation = dataRaw[1]

        const players = ecs.query([Player, Transform]).results()
        let chunkToUpdate;
        const worldData = ecs.getResource(WorldData)

        for (let [player, transform] of players) {
            if (player.id === targetUUID) {
                if (Math.abs(transform.pos.x - requestLocation.readInt16LE(0)*100) < 4000 && Math.abs(transform.pos.y - requestLocation.readInt16LE(2)*100) < 4000) {

                    const chunk = new Vec2(requestLocation.readInt16LE(0)/5, requestLocation.readInt16LE(2)/5).floor()
                    const block = new Vec2((requestLocation.readInt16LE(0)+map.size[0]*2.5)%5, (requestLocation.readInt16LE(2)+map.size[1]*2.5)%5)

                    if (worldData.blockData[chunk.x+map.size[0]/2][chunk.y+map.size[1]/2].blocks[block.x+block.y*5] == 0) {
                        worldData.blockData[chunk.x+map.size[0]/2][chunk.y+map.size[1]/2].blocks[block.x+block.y*5] = 1
                        chunkToUpdate = chunk.clone()
                    }
                }
            }
            break
        }

        if (chunkToUpdate) {
            let chunkPos = Buffer.alloc(4)
            chunkPos.writeInt16LE(chunkToUpdate.x, 0)
            chunkPos.writeInt16LE(chunkToUpdate.y, 2)

            let chunkData = Buffer.alloc(2)

            if (chunkToUpdate.x >= map.size[0]/2 || chunkToUpdate.x < -map.size[0]/2 || chunkToUpdate.y >= map.size[1]/2 || chunkToUpdate.y < -map.size[1]/2) {
                chunkData.writeUint8(0, 1)
            } else {
                chunkData.writeUint8(map.object[chunkToUpdate.x+map.size[0]/2][chunkToUpdate.y+map.size[1]/2], 1)
            }

            if (chunkToUpdate.x >= map.size[0]/2 || chunkToUpdate.x < -map.size[0]/2 || chunkToUpdate.y >= map.size[1]/2 || chunkToUpdate.y < -map.size[1]/2) {
                chunkData.writeUint8(4, 0)
            } else {
                chunkData.writeUint8(map.biome[chunkToUpdate.x+map.size[0]/2][chunkToUpdate.y+map.size[1]/2], 0)
            }

            let blockData = Buffer.alloc(25)
            blockData.fill(worldData.blockData[chunkToUpdate.x+map.size[0]/2][chunkToUpdate.y+map.size[1]/2].blocks)
            
            getServerPath(ecs, 'game').server.clients.forEach((socket) => {
                sendData(socket, 'chunk-update', stitch(chunkPos, chunkData, blockData))
            });
        }        
    })
}

export function ChunksPlugin(ecs: ECS) {
    ecs.insertResource(new WorldData())
    ecs.addMainSystems(listenChunks, listenBlocks)
}