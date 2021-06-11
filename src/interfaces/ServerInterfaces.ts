// This only contains the id's 
export interface TreeStructure {
    connections?: number[];
    children?: number[];
    parent?: number;
}

export enum ServerType {
    BasicServer,
    HackableServer,
    HomeServer,
    PurchasedServer
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

    securityLevel: number;
    money: number;
    availableRam: number;

    weakenTime: number;
    growTime: number;
    hackTime: number;
}