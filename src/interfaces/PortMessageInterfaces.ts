
export type MessageType = "Request" | "Response";

// NOTE: Here we should add all possible message codes
export type RequestCode = ServerRequestCode;
export type ResponseCode = ServerResponseCode;

export interface Message {
    type: MessageType;
}

export interface Request extends Message {
    code: RequestCode;
    id: string;
}

export interface Response extends Message {
    code: ResponseCode;
}

// The implementations ---------------------------------------------------

export enum ServerRequestCode {
    UPDATE,
}

export enum ServerResponseCode {
    SUCCESSFUL,
    FAILURE
}

export interface ServerRequest extends Request {
    code: ServerRequestCode;
}

export interface ServerResponse extends Response {
    code: ServerResponseCode;
    request: ServerRequest;
}