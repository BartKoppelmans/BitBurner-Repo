import Server         from '/src/classes/Server/Server.js'
import { Heuristics } from '/src/util/Heuristics.js'

export type ServerSortingOrder = 'ram' | 'server-value' | 'alphabetic'

export interface IServer {
	characteristics: ServerCharacteristics
	purpose: ServerPurpose
	reservation: number;
}

export interface IPurchasedServer extends IServer {
	characteristics: PurchasedServerCharacteristics
	quarantinedInformation: QuarantinedInformation
}

export interface IHacknetServer extends IServer {
	characteristics: HacknetServerCharacteristics
	nodeInformation: NodeInformation
}

export interface IHackableServer extends IServer {
	status: ServerStatus
	staticHackingProperties: StaticHackingProperties
	percentageToSteal: number,
	serverValue: Heuristics.HeuristicValue
}

// This only contains the id's
export interface TreeStructure {
	connections: string[];
	children: string[];
	parent: string; // NOTE: If the node does not have a parent, this will be the empty string
}

export interface ServerCharacteristics {
	id: string;
	type: ServerType;
	host: string;
	treeStructure: TreeStructure
}

export interface PurchasedServerCharacteristics extends ServerCharacteristics {
	purchasedServerId: number;
}

export interface HacknetServerCharacteristics extends ServerCharacteristics {
	hacknetServerId: number;
}

export interface NodeInformation {
	level: number;
	ram: number;
	cores: number
	cache: number;
	hashCapacity: number;
}

export enum ServerType {
	BasicServer,
	HackableServer,
	HomeServer,
	PurchasedServer,
	HacknetServer,
	DarkWebServer
}

export enum ServerPurpose {
	NONE = 'None',
	PREP = 'Prep',
	HACK = 'Hack'
}

export enum ServerStatus {
	NONE,
	PREPPING,
	TARGETING
}

export type QuarantinedInformation = {
	quarantined: false;
} | {
	quarantined: true;
	ram: number;
	originalPurpose: ServerPurpose
}

export interface StaticHackingProperties {
	minSecurityLevel: number;
	baseSecurityLevel: number;
	ports: number;
	hackingLevel: number;
	maxMoney: number;
	growth: number;
}

export interface ServerMap {
	lastUpdated: Date;
	servers: Server[];
}

export interface UtilizationDataPoint {
	prep: number;
	hack: number;
	total: number;
}