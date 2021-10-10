import type { BitBurner as NS } from 'Bitburner'
import * as ServerAPI           from '/src/api/ServerAPI.js'
import * as LogAPI              from '/src/api/LogAPI.js'
import Server                   from '/src/classes/Server/Server.js'
import * as ServerUtils         from '/src/util/ServerUtils.js'
import { CONSTANT }             from '/src/lib/constants.js'

enum PrintColor {
	PLAYER             = 'White',
	ROOTED_FACTION     = 'DeepPink',
	NOT_ROOTED_FACTION = 'Purple',
	ROOTED             = 'Lime',
	NOT_ROOTED         = 'Green',
	ROOTED_PIP         = 'Lime',
	NOT_ROOTED_PIP     = 'Red',
	PIPING             = 'White',
}

const showRootedPip      = false as const
const showCodingContract = true as const

function getServerColor(ns: NS, server: Server): string {
	const factionServers: string[] = ['CSEC', 'avmnite-02h', 'I.I.I.I', 'run4theh111z', 'w0r1d_d43m0n']

	if (ServerUtils.isHomeServer(server) || ServerUtils.isPurchasedServer(server)) return PrintColor.PLAYER
	if (factionServers.includes(server.characteristics.host)) return (server.isRooted(ns)) ? PrintColor.ROOTED_FACTION : PrintColor.NOT_ROOTED_FACTION
	return (server.isRooted(ns)) ? PrintColor.ROOTED : PrintColor.NOT_ROOTED
}

function getFormattedServerName(ns: NS, server: Server): string {
	const serverColor: string   = getServerColor(ns, server)
	const pipColor: string      = (server.isRooted(ns)) ? PrintColor.ROOTED_PIP : PrintColor.NOT_ROOTED_PIP
	const hasContracts: boolean = ns.ls(server.characteristics.host, '.cct').length > 0
	const clickFunction         = `
        const terminal = document.getElementById('terminal-input-text-box');
        terminal.value='home; run src/scripts/route.js ${server.characteristics.host}';
        document.body.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, keyCode: 13}));
    `

	let serverInformation: string = `<strong>${server.characteristics.host}</strong>`

	if (ServerUtils.isHackableServer(server)) {
		serverInformation += `<br>` +
			`Rooted: <span style="color:${pipColor}">${server.isRooted(ns)}</span><br>` +
			`Hack Level Req: ${server.staticHackingProperties.hackingLevel}<br>` +
			`Money: ${ns.nFormat(server.getMoney(ns), '$0.000a')} / ${ns.nFormat(server.staticHackingProperties.maxMoney, '$0.000a')}<br>` +
			`Security: ${server.getSecurityLevel(ns)} / Min ${server.staticHackingProperties.minSecurityLevel}<br>` +
			`Growth: ${server.staticHackingProperties.growth}`
	}

	if (ServerUtils.isPurchasedServer(server)) {
		const quarantinedColor: string = (server.isQuarantined()) ? PrintColor.ROOTED_PIP : PrintColor.NOT_ROOTED_PIP

		serverInformation += `<br>` +
			`Quarantined: <span style="color:${quarantinedColor}">${server.quarantinedInformation.quarantined}</span><br>` +
			`Purpose: ${server.purpose.toString()}<br>` +
			`Ram: ${server.getTotalRam(ns)}`
	}

	return `<span style="color: ${pipColor}; display: ${(showRootedPip) ? 'inline' : 'none'}">◉</span>` +
		`<span class="tooltip">` +
		`<a class="scan-analyze-link" onClick="${clickFunction}" style="color: ${serverColor}">${server.characteristics.host}` +
		`<span class="tooltiptext" style="text-align: left;">${serverInformation}</span>` +
		`</a>` +
		`</span>` +
		`<span style="color: ${pipColor}; display: ${(showCodingContract && hasContracts) ? 'inline' : 'none'}">⋐</span>`
}

async function printChildren(ns: NS, server: Server, level: number, isLastChild: boolean) {
	let prefixes: string = '│ '.repeat(Math.max(level - 1, 0))

	if (!ServerUtils.isHomeServer(server)) {
		prefixes += (isLastChild) ? '└> ' : '├> '
	}

	// noinspection CssUnresolvedCustomProperty
	LogAPI.printTerminal(ns, `${prefixes}${getFormattedServerName(ns, server)}`)

	for (const [index, childId] of server.characteristics.treeStructure.children.entries()) {
		const child: Server = await ServerAPI.getServer(ns, childId)
		await printChildren(ns, child, level + 1, (index === server.characteristics.treeStructure.children.length - 1))
	}
}

export async function main(ns: NS) {
	const isInitialized: boolean = ServerAPI.isServerMapInitialized(ns)
	if (!isInitialized) await ServerAPI.initializeServerMap(ns)

	const home: Server = await ServerAPI.getServer(ns, CONSTANT.HOME_SERVER_ID)

	await printChildren(ns, home, 0, true)
}