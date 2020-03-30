// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export default class DelayedAction {
    action: Function;
    timer: NodeJS.Timeout | null;

    constructor(action: Function) {
        this.action = action;

        this.timer = null;
    }

    fire = (): void => {
        this.action();

        this.timer = null;
    }

    fireAfter = (timeout: number): void => {
        if (this.timer !== null) {
            clearTimeout(this.timer);
        }

        this.timer = setTimeout(this.fire, timeout);
    }

    cancel = (): void => {
        if (this.timer !== null) {
            clearTimeout(this.timer);
        }
    }
}
