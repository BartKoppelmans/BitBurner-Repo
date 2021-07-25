import Server from "/src/classes/Server.js";

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
    TARGETTING
}

export interface QuarantinedServer {
    originalPurpose: ServerPurpose,
    server: Server;
    ram: number;
}

export interface StaticHackingProperties {
    minSecurityLevel: number;
    baseSecurityLevel: number;
    ports: number;
    hackingLevel: number;
    maxMoney: number;
    growth: number;
}

export interface DynamicHackingProperties {

    lastUpdated: Date;

    percentageToSteal: number;

    securityLevel: number;
    money: number;
}

export interface ServerMapFile {
    lastUpdated: Date;
    serverMap: Server[];
}

export interface ReservedServer {
    reserved: number;
    server: Server;
}

export type ReservedServerMap = ReservedServer[];