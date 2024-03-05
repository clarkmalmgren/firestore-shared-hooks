import { Firestore } from 'firebase/firestore';
export type Listener<T> = (data: T) => void | any;
export type Unsubscribe = (() => void) & {
    id: number;
};
export declare abstract class SharedListenerService<T> {
    private static nextServiceId;
    readonly serviceId: number;
    private state;
    private nextId;
    private listeners;
    private oneTimeListeners;
    private lastValue;
    private connectingTimeout;
    private disconnectingTimeout;
    protected disconnectDelay: number;
    protected abstract connect(): void;
    protected abstract disconnect(): void;
    protected onData(data: T): void;
    subscribe(listener: Listener<T>): Unsubscribe;
    unsubscribe(id: number | undefined): void;
    oneTime(listener: Listener<T>): void;
    get debug(): string;
}
export declare abstract class SharedCollectionListenerService<T> extends SharedListenerService<{
    [id: string]: T;
}> {
    readonly db: Firestore;
    readonly path: string;
    private _unsub;
    constructor(db: Firestore, path: string);
    connect(): void;
    disconnect(): void;
}
export declare abstract class SharedDocumentListenerService<T> extends SharedListenerService<T | undefined> {
    readonly db: Firestore;
    readonly path: string;
    private _unsub;
    constructor(db: Firestore, path: string);
    connect(): void;
    disconnect(): void;
}
export declare function useSharedHook<T, S>(service: SharedListenerService<T>, selector: (data: T) => S, deps?: any[]): S | undefined;
