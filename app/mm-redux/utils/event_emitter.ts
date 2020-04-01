// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
function isFunction(obj: any): boolean {
    return typeof obj === 'function';
}

class EventEmitter {
    listeners: Map<string, Array<Function>>;

    constructor() {
        this.listeners = new Map();
    }

    addListener(label: string, callback: Function): void {
        if (!this.listeners.has(label)) {
            this.listeners.set(label, []);
        }

        this.listeners.get(label)!.push(callback);
    }

    on(label: string, callback: Function): void {
        this.addListener(label, callback);
    }

    removeListener(label: string, callback: Function): boolean {
        const listeners = this.listeners.get(label);
        let index;

        if (listeners && listeners.length) {
            index = listeners.reduce((i, listener, idx) => {
                return isFunction(listener) && listener === callback ? idx : i;
            }, -1);

            if (index > -1) {
                listeners.splice(index, 1);
                this.listeners.set(label, listeners);
                return true;
            }
        }
        return false;
    }

    off(label: string, callback: Function): void {
        this.removeListener(label, callback);
    }

    emit(label: string, ...args: Array<any>): boolean {
        const listeners = this.listeners.get(label);

        if (listeners && listeners.length) {
            listeners.forEach((listener) => {
                listener(...args);
            });
            return true;
        }
        return false;
    }
}

export default new EventEmitter();
