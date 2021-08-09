import { ServerPurpose, ServerStatus } from '/src/interfaces/ServerInterfaces.js'

export type MessageType = 'Request' | 'Response';

// NOTE: Here we should add all possible message codes
export type RequestCode = ServerRequestCode | ControlFlowCode | JobMessageCode | LogMessageCode;

export interface Message {
	type: MessageType;
}

export interface Request extends Message {
	code: RequestCode;
	id: string;
}

export interface Response extends Message {
}

// The implementations ---------------------------------------------------

export enum ServerRequestCode {
	UPDATE_SERVER_MAP,
	UPDATE_SERVER_STATUS,
	UPDATE_SERVER_PURPOSE,
}

export enum ControlFlowCode {
	KILL_MANAGERS,
	KILL_DAEMON,
	KILL_LOGMANAGER,
}

export enum JobMessageCode {
	NEW_JOB,
	NEW_BATCH_JOB
}

export enum LogMessageCode {
	INFORMATION,
	WARNING,
	HACKING,
	PURCHASED_SERVER,
	CODING_CONTRACT
}


export interface ServerRequest extends Request {
	code: ServerRequestCode;
}

export interface ServerStatusRequest extends ServerRequest {
	body: { server: string, status: ServerStatus; };
}

export interface ServerPurposeRequest extends ServerRequest {
	body: { server: string, purpose: ServerPurpose; };
}

export interface ServerResponse extends Response {
	request: ServerRequest;
}

export interface LogMessageRequest extends Request {
	code: LogMessageCode;
	body: { message: string, printDate: boolean; };
}

// Note: This can also be a BatchJob
export interface JobMessageRequest extends Request {
	code: JobMessageCode;
	body: string; // This has to be serialized because of the map
}

export interface JobMessageResponse extends Response {
	request: JobMessageRequest;
}


export interface ControlFlowRequest extends Request {
	code: ControlFlowCode;
}