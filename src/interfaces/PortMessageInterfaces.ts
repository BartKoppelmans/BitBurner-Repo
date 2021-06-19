
export type MessageType = "Request" | "Response";

// NOTE: Here we should add all possible message codes
export type RequestCode = ServerRequestCode | JobRequestCode | ControlFlowCode;

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
    UPDATE,
}

export enum JobRequestCode {
    CURRENT_TARGETS,
    IS_PREPPING,
    IS_TARGETTING
}

export enum ControlFlowCode {
    KILL_MANAGERS,
    KILL_DAEMON
}


export interface ServerRequest extends Request {
    code: ServerRequestCode;
}

export interface ServerResponse extends Response {
    request: ServerRequest;
}


export interface ControlFlowRequest extends Request {
    code: ControlFlowCode;
}


export interface JobRequest extends Request {
    code: JobRequestCode;
}

export interface JobActionRequest extends JobRequest {
    body: string;
}

export interface JobTargetsResponse extends Response {
    body: string[];
    request: JobRequest;
}

export interface JobActionResponse extends Response {
    body: boolean;
    request: JobRequest;
}