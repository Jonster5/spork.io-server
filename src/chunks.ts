import { ECS } from "raxis";
import { SocketMessageEvent, decodeString, encodeString, sendData, stitch, unstitch } from "raxis-server";
import { Player } from "./player";
import { Transform } from "raxis-plugins";
import map from './assets/map.json'

function listenChunks(ecs: ECS) {
    ecs.getEventReader(SocketMessageEvent).get().forEach((event) => {
        if (event.handler.path !== 'game' || event.type !== 'chunks') return

        const dataRaw = unstitch(event.body)
        const targetUUID = decodeString(dataRaw[0])

        const players = ecs.query([Player, Transform]).results()
        const chunksPermitted = []

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
            
        })
        
        chunksPermitted.forEach((chunk, i) => {
            permitChunkBuffer.writeInt16LE(chunk[0], i*4 + 0 + 2 * chunksPermitted.length)
            permitChunkBuffer.writeInt16LE(chunk[1], i*4 + 2 + 2 * chunksPermitted.length)
        })
        
        sendData(event.socket, 'chunks-permitted', permitChunkBuffer)
    })
}

export function ChunksPlugin(ecs: ECS) {
    ecs.addMainSystem(listenChunks)
}