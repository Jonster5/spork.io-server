import { Component, ECS, ECSEvent } from 'raxis';
import { SocketMessageEvent, decodeString, unstitch } from 'raxis-server';
import { Player } from './player';
import { Inventory } from './inventory';

export type ToolType = 'wood' | 'stone' | 'melee' | 'projectile';
export type ToolTier = 0 | 1 | 2 | 3;
export type ToolList = [ToolTier, ToolTier, ToolTier, ToolTier];

export class Tools extends Component {
	wood: ToolTier = 0;
	stone: ToolTier = 0;
	melee: ToolTier = 0;
	projectile: ToolTier = 0;

	serialize(): ArrayBufferLike {
		return new Uint8Array([
			this.wood,
			this.stone,
			this.melee,
			this.projectile,
		]).buffer;
	}

	static deserialize(buffer: ArrayBufferLike): Component {
		const data = new Uint8Array(buffer);
		const tools = new Tools();
		tools.wood = data[0] as ToolTier;
		tools.stone = data[1] as ToolTier;
		tools.melee = data[2] as ToolTier;
		tools.projectile = data[3] as ToolTier;

		return tools;
	}
}

function recieveUpgradeRequests(ecs: ECS) {
	ecs.getEventReader(SocketMessageEvent).get().forEach((event) => {
        if (event.handler.path !== 'game' || event.type !== 'upgrade-request') return

        const dataRaw = unstitch(event.body)
        const targetUUID = decodeString(dataRaw[0])
		const targetTool = dataRaw[1].readUint8(0)

        const players = ecs.query([Player, Tools, Inventory]).results()
		for (let [player, tool, inventory] of players) {
			if (player.id !== targetUUID) continue;
			
			switch (targetTool) {
				case(0):
					if (inventory.wood >= 20 && tool.wood < 3) {tool.wood++; inventory.wood -= 20}
					break;
				case(1):
					if (inventory.stone >= 20 && tool.wood < 3) {tool.stone++; inventory.stone -= 20}
					break
			}
		}
	})
}

export function ToolsPlugin(ecs: ECS) {
	ecs.addComponentTypes(Tools)
	.addMainSystem(recieveUpgradeRequests)
}
