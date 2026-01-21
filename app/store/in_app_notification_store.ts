// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';

type InAppNotificationState = {
    visible: boolean;
    notification: NotificationWithData | null;
    serverName?: string;
    serverUrl?: string;
};

class InAppNotificationStoreSingleton {
    private subject = new BehaviorSubject<InAppNotificationState>({
        visible: false,
        notification: null,
        serverName: undefined,
        serverUrl: undefined,
    });

    /**
     * Show notification - replaces any existing notification
     */
    show = (notification: NotificationWithData, serverUrl: string, serverName?: string) => {
        this.subject.next({
            visible: true,
            notification,
            serverUrl,
            serverName,
        });
    };

    /**
     * Dismiss current notification
     */
    dismiss = () => {
        this.subject.next({
            visible: false,
            notification: null,
            serverUrl: undefined,
            serverName: undefined,
        });
    };

    observe() {
        return this.subject.asObservable();
    }

    getState() {
        return this.subject.value;
    }
}

const InAppNotificationStore = new InAppNotificationStoreSingleton();
export default InAppNotificationStore;
