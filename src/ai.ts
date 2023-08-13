import { Component, ECS } from 'raxis';

export class PassiveAI extends Component {
	constructor() {
		super();
	}
}

export class HostileAI extends Component {
	constructor() {
		super();
	}
}

export function AIPlugin(ecs: ECS) {
	ecs.addComponentTypes(PassiveAI, HostileAI);
}
