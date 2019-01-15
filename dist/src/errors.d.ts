export interface IErrorDescription {
    error: string;
    error_description: string;
}
export declare const errorHandler: (msg: import("./message").IMessage, logger: import("winston").Logger) => (err?: unknown) => void;
