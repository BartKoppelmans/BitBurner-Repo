import type { NS }                                from 'Bitburner'
import { createBox }                              from '/src/UI/API/box.js'
import HackableServer                             from '/src/classes/Server/HackableServer.js'
import * as ServerAPI                             from '/src/api/ServerAPI.js'
import { DOMcreateElement }                       from '/src/UI/API/index.js'
import { Colors }                                 from '/src/UI/styles/hackingUIstyles.js'
import { ServerStatus }                           from '/src/classes/Server/ServerInterfaces.js'
import { initializeStates, MainBox, ServerEntry } from '/src/UI/elements/hackingUIelements.js'

let box: HTMLElement
const sortOrder: ServerStatus[] = [ServerStatus.TARGETING, ServerStatus.PREPPING, ServerStatus.NONE]


async function initialize(ns: NS): Promise<void> {
	box = createBox('Hacking analysis tool', MainBox())

	initializeStates(ns)

	const closeButton = box.querySelector('.boxclose')
	if (closeButton) closeButton.addEventListener('click', () => ns.exit())

	// TODO: Load the theme dynamically
	// https://discord.com/channels/415207508303544321/415207923506216971/908147540996792370

	for (const key in Colors) {
		if (Colors.hasOwnProperty(key)) {
			const value = Colors[key]
			box.style.setProperty(`--${key}`, value)
		}
	}
}

function setContent(ns: NS, elements: JSX.Element[]): void {
	const contentElement: HTMLTableSectionElement | null = box.querySelector('#boxContent')
	if (!contentElement) return

	// TODO: Remove this flag
	// @ts-ignore
	contentElement.replaceChildren(...elements)
}

async function updateBox(ns: NS): Promise<void> {
	const servers: HackableServer[] = ServerAPI.getHackableServers(ns)
	servers.sort((a, b) => sortOrder.indexOf(a.status) - sortOrder.indexOf(b.status))
	const content: JSX.Element[] = []
	for (const server of servers) {
		const serverEntry: JSX.Element = ServerEntry(ns, server)
		content.push(serverEntry)
	}
	setContent(ns, content)
}


export async function main(ns: NS) {
	await initialize(ns)

	while (true) {
		await updateBox(ns)
		await ns.sleep(100)
	}
}