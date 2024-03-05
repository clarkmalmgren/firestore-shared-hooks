"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSharedHook = exports.SharedDocumentListenerService = exports.SharedCollectionListenerService = exports.SharedListenerService = void 0;
const react_1 = require("react");
const firestore_1 = require("firebase/firestore");
var State;
(function (State) {
    State[State["Disconnected"] = 0] = "Disconnected";
    State[State["Connecting"] = 1] = "Connecting";
    State[State["Connected"] = 2] = "Connected";
    State[State["Disconnecting"] = 3] = "Disconnecting";
})(State || (State = {}));
class SharedListenerService {
    constructor() {
        this.serviceId = SharedListenerService.nextServiceId++;
        this.state = State.Disconnected;
        this.nextId = 0;
        this.listeners = {};
        this.oneTimeListeners = [];
        this.disconnectDelay = 1000;
    }
    onData(data) {
        if (this.state === State.Disconnected) {
            console.warn(`Triggered onData cycle for unitialized SharedListenerService. Cleanup didn't happen properly.`);
        }
        this.lastValue = data;
        Object.values(this.listeners).forEach(l => l(data));
        // Always trigger the one time listeners last
        this.oneTimeListeners.forEach(l => l(data));
        this.oneTimeListeners = [];
    }
    subscribe(listener) {
        const id = this.nextId++;
        this.listeners[id] = listener;
        switch (this.state) {
            // When disconnected, start connecting (asyncronously)
            case State.Disconnected:
                this.connectingTimeout = setTimeout(() => {
                    this.connect();
                    this.state = State.Connected;
                    this.connectingTimeout = undefined;
                });
                this.state = State.Connecting;
                break;
            case State.Connecting:
                // While connecting, don't need to do anything because we know the first onData hasn't happened yet
                break;
            case State.Connected:
                // If connected, asyncronously send the last known value
                setTimeout(() => this.lastValue && listener(this.lastValue));
                break;
            case State.Disconnecting:
                // If disconnecting, cancel the disconnection timer, update state, and then asynchronously send the last known value
                clearTimeout(this.disconnectingTimeout);
                this.state = State.Connected;
                setTimeout(() => this.lastValue && listener(this.lastValue));
                break;
        }
        const unsub = (() => { this.unsubscribe(id); });
        unsub.id = id;
        return unsub;
    }
    unsubscribe(id) {
        if (typeof id === 'undefined') {
            return;
        }
        delete this.listeners[id];
        const isEmpty = Object.keys(this.listeners).length === 0;
        // If somehow unsubscribed before we ever connected, just cancel connection
        if (isEmpty && this.state === State.Connecting) {
            clearTimeout(this.connectingTimeout);
            this.state = State.Disconnected;
        }
        else if (isEmpty && this.state === State.Connected) {
            this.disconnectingTimeout = setTimeout(() => {
                this.disconnect();
                this.state = State.Disconnected;
                this.disconnectingTimeout = undefined;
                this.lastValue = undefined;
            });
            this.state = State.Disconnecting;
        }
    }
    oneTime(listener) {
        if (this.state === State.Connected && this.lastValue) {
            listener(this.lastValue);
        }
        else {
            this.oneTimeListeners[this.nextId++] = listener;
        }
    }
    get debug() {
        return `[state=${this.state}, listenerCount=${Object.keys(this.listeners).length}, hasData=${!!this.lastValue}]`;
    }
}
exports.SharedListenerService = SharedListenerService;
SharedListenerService.nextServiceId = 0;
class SharedCollectionListenerService extends SharedListenerService {
    constructor(db, path) {
        super();
        this.db = db;
        this.path = path;
    }
    connect() {
        const ref = (0, firestore_1.collection)(this.db, this.path);
        this._unsub = (0, firestore_1.onSnapshot)(ref, (snap) => {
            const collection = snap.docs.reduce((c, v) => (Object.assign(Object.assign({}, c), { [v.id]: v.data() })), {});
            this.onData(collection);
        });
    }
    disconnect() {
        var _a;
        (_a = this._unsub) === null || _a === void 0 ? void 0 : _a.call(this);
    }
}
exports.SharedCollectionListenerService = SharedCollectionListenerService;
class SharedDocumentListenerService extends SharedListenerService {
    constructor(db, path) {
        super();
        this.db = db;
        this.path = path;
    }
    connect() {
        const ref = (0, firestore_1.doc)(this.db, this.path);
        this._unsub = (0, firestore_1.onSnapshot)(ref, (snap) => {
            this.onData(snap.data());
        });
    }
    disconnect() {
        var _a;
        (_a = this._unsub) === null || _a === void 0 ? void 0 : _a.call(this);
    }
}
exports.SharedDocumentListenerService = SharedDocumentListenerService;
function useSharedHook(service, selector, deps) {
    const [value, setValue] = (0, react_1.useState)();
    (0, react_1.useEffect)(() => service.subscribe((data) => setValue(selector(data))), deps ? [service.serviceId, ...deps] : [service.serviceId] // eslint-disable-line
    );
    return value;
}
exports.useSharedHook = useSharedHook;
