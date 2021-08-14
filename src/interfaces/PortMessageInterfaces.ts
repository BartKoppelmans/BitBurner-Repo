export type MessageType = 'Request' | 'Response';

// NOTE: Here we should add all possible message codes
export type RequestCode = ControlFlowCode

export interface Message {
	type: MessageType;
}

export interface Request extends Message {
	code: RequestCode;
	id: string;
}

// The implementations ---------------------------------------------------

export enum ControlFlowCode {
	KILL_MANAGERS,
	KILL_DAEMON,
}


export interface ControlFlowRequest extends Request {
	code: ControlFlowCode;
}