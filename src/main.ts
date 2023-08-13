import { ECS } from 'raxis';
import { HostPlugin, HostSettings, ServerPlugin, createServerPath } from 'raxis-server';
import { TimePlugin, TransformPlugin } from 'raxis-plugins';
import { UpdatePlugin } from './update';
import { PlayerPlugin } from './player';
import { EndpointPlugin } from './endpoints';
import { MapPlugin } from './rendermap';
import { ChunksPlugin } from './chunks';
import { InventoryPlugin } from './inventory';
import { ToolsPlugin } from './tools';
import { HealthPlugin } from './health';
import { GatheringPlugin } from './gathering';
import { FlagsPlugin } from './flags';
import { NPCPlugin } from './npc';
import { AIPlugin } from './ai';

new ECS()
	.insertPlugins(HostPlugin, ServerPlugin, TimePlugin, TransformPlugin)
	.insertResource(
		new HostSettings({
			port: 5100,
			cb: (p) => console.log(`Listening on port ${p}`),
		})
	)
	.insertPlugins(
		EndpointPlugin,
		PlayerPlugin,
		UpdatePlugin,
		MapPlugin,
		ChunksPlugin,
		InventoryPlugin,
		ToolsPlugin,
		HealthPlugin,
		FlagsPlugin,
		GatheringPlugin,
		NPCPlugin,
		AIPlugin
	)
	.addStartupSystem((ecs) => {
		createServerPath(ecs, 'game');
		createServerPath(ecs, 'chat');
	})
	.run(30);
