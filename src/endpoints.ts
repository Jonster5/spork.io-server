import { ECS } from 'raxis';
import { HTTPHost } from 'raxis-server';
import { Player } from './player';

function getServerDetails(ecs: ECS) {
	const server = ecs.getResource(HTTPHost).server;

	server.on('request', (req, res) => {
		if (req.method === 'GET') {
			const content = {
				online: true,
				name: 'Local Dev Server',
				playerCount: ecs.query([Player]).size(),
			};

			res.writeHead(200, {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'Application/json',
			});
			res.write(Buffer.from(JSON.stringify(content)));
			res.end();
		}
	});
}

export function EndpointPlugin(ecs: ECS) {
	ecs.addStartupSystem(getServerDetails);
}
