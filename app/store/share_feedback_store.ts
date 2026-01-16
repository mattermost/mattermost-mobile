// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';

type ShareFeedbackState = {
    visible: boolean;
};

class ShareFeedbackStoreSingleton {
    private subject = new BehaviorSubject<ShareFeedbackState>({
        visible: false,
    });

    /**
     * Show share feedback overlay
     */
    show = () => {
        this.subject.next({
            visible: true,
        });
    };

    /**
     * Dismiss share feedback overlay
     */
    dismiss = () => {
        this.subject.next({
            visible: false,
        });
    };

    observe() {
        return this.subject.asObservable();
    }

    getState() {
        return this.subject.value;
    }
}

const ShareFeedbackStore = new ShareFeedbackStoreSingleton();
export default ShareFeedbackStore;
