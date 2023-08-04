import { ECS } from 'raxis';
import {
	HostPlugin,
	HostSettings,
	ServerPlugin,
	createServerPath,
} from 'raxis-server';
import { TimePlugin, TransformPlugin } from 'raxis-plugins';
import { UpdatePlugin } from './update';
import { PlayerPlugin } from './player';
import { EndpointPlugin } from './endpoints';

new ECS()
	.insertPlugins(HostPlugin, ServerPlugin, TimePlugin, TransformPlugin)
	.insertResource(
		new HostSettings({
			port: 5100,
			cb: (p) => console.log(`Listing on port ${p}`),
		})
	)
	.insertPlugins(PlayerPlugin, UpdatePlugin, EndpointPlugin)
	.addStartupSystem((ecs) => {
		createServerPath(ecs, 'game');
		createServerPath(ecs, 'chat');
	})
	.run(30);
