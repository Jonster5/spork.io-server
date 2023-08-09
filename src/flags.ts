import { Component, ECS } from 'raxis';
import type { ToolType } from './tools';
import { decodeString, encodeString, stitch, unstitch } from 'raxis-plugins';

export class Flags extends Component {
	constructor(public isClicking: boolean, public selectedTool: ToolType) {
		super();
	}

	serialize(): ArrayBufferLike {
		return stitch(
			new Uint8Array([this.isClicking ? 1 : 0]).buffer,
			encodeString(this.selectedTool)
		);
	}

	static deserialize(buffer: ArrayBufferLike): Flags {
		const data = unstitch(buffer);
		const isClicking = new DataView(data[0]).getUint8(0) === 1;
		const selectedTool = decodeString(data[1]) as ToolType;

		return new Flags(isClicking, selectedTool);
	}
}

export function FlagsPlugin(ecs: ECS) {
	ecs.addComponentType(Flags);
}
