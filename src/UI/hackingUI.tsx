import type { BitBurner as NS } from 'Bitburner'
import { createBox }            from '/src/UI/API/box.js'
import HackableServer           from '/src/classes/Server/HackableServer.js'
import * as ServerAPI           from '/src/api/ServerAPI.js'
import * as JobAPI              from '/src/api/JobAPI.js'
import { DOMcreateElement }     from '/src/UI/API/index.js'
import { styles }               from '/src/UI/hackingUIstyles.js'
import { ServerStatus }         from '/src/classes/Server/ServerInterfaces.js'
import Batch                    from '/src/classes/Job/Batch.js'

let box: HTMLElement;

function getBoxHTML(): JSX.Element {
	return <div className='resizable' style="height: 520px; width: 720px; overflow:auto;">
			{styles}
			<table style='width: 100%;'>
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

function getServerStatusClass(status: ServerStatus): string {
	switch (status) {
		case ServerStatus.NONE:
			return 'status-none'
		case ServerStatus.PREPPING:
			return 'status-prep'
		case ServerStatus.TARGETING:
			return 'status-hack'
	}
}

function createServerEntry(ns: NS, server: HackableServer): JSX.Element {

	let cyclesRow: JSX.Element | null = null
	if (server.status === ServerStatus.TARGETING) {
		const batch: Batch = JobAPI.getServerBatchJob(ns, server)
		const finishedCycles: number = batch.getNumFinishedCycles()
		const totalCycles: number = batch.getNumCycles()
		cyclesRow = <td colspan={4}>Cycle {finishedCycles+1} / {totalCycles}</td>
	}

	return <tr className={`serverEntry ${getServerStatusClass(server.status)}`}>
			<td colspan='4'>{server.characteristics.host}</td>
			<td colspan='2'>{ns.nFormat(server.getMoney(ns), '$0.000a')} / {ns.nFormat(server.staticHackingProperties.maxMoney, '$0.000a')}</td>
			<td colspan='2'>{ns.nFormat(server.getSecurityLevel(ns), '0.000')} / {ns.nFormat(server.staticHackingProperties.minSecurityLevel, '0.000')}</td>
			{cyclesRow}
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
		await ns.sleep(100)
	}
}