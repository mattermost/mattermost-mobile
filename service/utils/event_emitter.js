// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

function isFunction(obj) {
    return typeof obj === 'function';
}

class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }

    addListener(label, callback) {
        if (!this.listeners.has(label)) {
            this.listeners.set(label, []);
        }
        this.listeners.get(label).push(callback);
    }

    on(label, callback) {
        this.addListener(label, callback);
    }

    removeListener(label, callback) {
        const listeners = this.listeners.get(label);
        let index;

        if (listeners && listeners.length) {
            index = listeners.reduce((i, listener, idx) => {
                return (isFunction(listener) && listener === callback) ? idx : i;
            }, -1);

            if (index > -1) {
                listeners.splice(index, 1);
                this.listeners.set(label, listeners);
                return true;
            }
        }
        return false;
    }

    off(label, callback) {
        this.removeListener(label, callback);
    }

    emit(label, ...args) {
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
