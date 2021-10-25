import type { BitBurner as NS } from 'Bitburner'
import { createBox }            from '/src/UI/API/box.js'
import HackableServer           from '/src/classes/Server/HackableServer.js'
import * as ServerAPI           from '/src/api/ServerAPI.js'
import { DOMcreateElement }     from '/src/UI/API/index.js'
import { styles }               from '/src/UI/hackingUIstyles.js'

let box: HTMLElement;

function getBoxHTML(): JSX.Element {
	return <div className='resizable' style="height: 520px; width: 720px; overflow:auto;">
			{styles}
			<table style='width: 100%;'>
				<tr>
					<th>Server</th>
					<th>Money</th>
					<th>Security</th>
				</tr>
				<tbody id="boxContent"/>
			</table>
		</div>
}

async function initialize(ns: NS): Promise<void> {
	box = createBox('Hacking analysis tool', getBoxHTML());
	const closeButton = box.querySelector(".boxclose");
	if (closeButton) closeButton.addEventListener('click',()=>ns.exit())
}

function setContent(ns: NS, elements: JSX.Element[]): void {
	const contentElement: HTMLTableSectionElement | null = box.querySelector('#boxContent')
	if (!contentElement) return

	// TODO: Remove this flag
	// @ts-ignore
	contentElement.replaceChildren(...elements)
}

function createServerEntry(ns: NS, server: HackableServer): JSX.Element {
	return <tr>
			<td>{server.characteristics.host}</td>
			<td>{ns.nFormat(server.getMoney(ns), '$0.000a')} / {ns.nFormat(server.staticHackingProperties.maxMoney, '$0.000a')}</td>
			<td>{ns.nFormat(server.getSecurityLevel(ns), '0.000')} / {ns.nFormat(server.staticHackingProperties.minSecurityLevel, '0.000')}</td>
		</tr>
}

async function updateBox(ns: NS): Promise<void> {
	const servers: HackableServer[] = ServerAPI.getHackableServers(ns)
	const content: JSX.Element[] = [];
	for (const server of servers) {
		const serverEntry: JSX.Element = createServerEntry(ns, server)
		content.push(serverEntry)
	}
	setContent(ns, content)
}


export async function main(ns: NS) {
	await initialize(ns)

	while (true) {
		await updateBox(ns)
		await ns.sleep(1000)
	}
}