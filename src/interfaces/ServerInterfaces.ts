import Server          from '/src/classes/Server.js'
import HackableServer  from '/src/classes/HackableServer.js'
import PurchasedServer from '/src/classes/PurchasedServer.js'

// This only contains the id's
export interface TreeStructure {
	connections?: number[];
	children?: number[];
	parent?: number;
}

export interface ServerCharacteristics {
	id: number;
	type: ServerType;
	host: string;
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

export type ServerList = Server[]
export type HackableServerList = HackableServer[]
export type PurchasedServerList = PurchasedServer[]