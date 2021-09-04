import Server         from '/src/classes/Server/Server.js'
import { Heuristics } from '/src/util/Heuristics.js'

export interface IServer {
	characteristics: ServerCharacteristics
	purpose: ServerPurpose
	reservation: number;
}

export interface IPurchasedServer extends IServer {
	characteristics: PurchasedServerCharacteristics
	quarantinedInformation: QuarantinedInformation
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

export enum ServerType {
	BasicServer,
	HackableServer,
	HomeServer,
	PurchasedServer,
	DarkWebServer
}

export enum ServerPurpose {
	NONE,
	PREP,
	HACK
}

export enum ServerStatus {
	NONE,
	PREPPING,
	TARGETING
}

export interface QuarantinedInformation {
	quarantined: boolean;
	ram?: number;
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