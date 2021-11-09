import type { NS }          from 'Bitburner'
import HackableServer       from '/src/classes/Server/HackableServer.js'
import { ServerStatus }     from '/src/classes/Server/ServerInterfaces.js'
import * as ServerAPI       from '/src/api/ServerAPI.js'
import { DOMcreateElement } from '/src/UI/API/index.js'
import { Styles }           from '/src/UI/styles/hackingUIstyles.js'
import Element = JSX.Element

export const collapsedStates: Record<string, boolean> = {}

export function initializeStates(ns: NS): void {
	const servers: HackableServer[] = ServerAPI.getHackableServers(ns)
	for (const server of servers) {
		collapsedStates[server.characteristics.host] = true
	}
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

export const MainBox = (): JSX.Element => {
	return <div className="resizable" style="height: 520px; width: 720px; overflow:auto;">
		{Styles}
		<table style="width: 100%;">
			<tbody id="boxContent"/>
		</table>
	</div>
}

function getCollapsedState(server: HackableServer): boolean {
	return collapsedStates[server.characteristics.host]
}

function toggleServerEntryDetails(event: MouseEvent, server: HackableServer): void {

	if (server.status !== ServerStatus.TARGETING) return

	event.stopImmediatePropagation()
	event.preventDefault()

	const serverEntryDetails: Element | null | undefined = (event.currentTarget as Element).parentElement?.querySelector(`.serverEntryDetails.server-${server.characteristics.id}`)

	if (!serverEntryDetails) return

	const isCollapsed: boolean = serverEntryDetails.classList.contains('collapsed')

	if (isCollapsed) {
		serverEntryDetails.classList.remove('collapsed')
		collapsedStates[server.characteristics.host] = false
	} else {
		serverEntryDetails.classList.add('collapsed')
		collapsedStates[server.characteristics.host] = true
	}
}

export const ServerEntryDetails = (ns: NS, server: HackableServer): JSX.Element => {
	if (server.status !== ServerStatus.TARGETING) return <span/>
	return <span/>
	/*
	 TODO: Make sure that this shit works again

	 const batch: Batch = JobAPI.getServerBatchJob(ns, server)
	 const finishedCycles: number = batch.getNumFinishedCycles()
	 const totalCycles: number = batch.getNumCycles()

	 return <tr className={`serverEntryDetails ${getCollapsedState(server) ? 'collapsed' : ''} server-${server.characteristics.id}`}>
	 <td>{`Cycle ${finishedCycles+1} / ${totalCycles}`}</td>
	 </tr>
	 */
}

export const ServerEntry = (ns: NS, server: HackableServer): JSX.Element => {
	return (<tbody className="serverEntry">
	<tr className={`serverEntryOverview ${getServerStatusClass(server.status)} server-${server.characteristics.id}`}
	    onClick={(e: MouseEvent) => toggleServerEntryDetails(e, server)}>
		<td>{server.characteristics.host}</td>
		<td>{ns.nFormat(server.getMoney(ns), '$0.000a')} / {ns.nFormat(server.staticHackingProperties.maxMoney, '$0.000a')}</td>
		<td>{ns.nFormat(server.getSecurityLevel(ns), '0.000')} / {ns.nFormat(server.staticHackingProperties.minSecurityLevel, '0.000')}</td>
	</tr>
	{ServerEntryDetails(ns, server)}
	</tbody>)
}