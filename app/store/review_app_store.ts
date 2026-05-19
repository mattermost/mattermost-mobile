// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';

type ReviewAppState = {
    visible: boolean;
    hasAskedBefore: boolean;
};

class ReviewAppStoreSingleton {
    private subject = new BehaviorSubject<ReviewAppState>({
        visible: false,
        hasAskedBefore: false,
    });

    /**
     * Show review app overlay
     */
    show = (hasAskedBefore: boolean) => {
        this.subject.next({
            visible: true,
            hasAskedBefore,
        });
    };

    /**
     * Dismiss review app overlay
     */
    dismiss = () => {
        this.subject.next({
            visible: false,
            hasAskedBefore: false,
        });
    };

    observe() {
        return this.subject.asObservable();
    }

    getState() {
        return this.subject.value;
    }
}

const ReviewAppStore = new ReviewAppStoreSingleton();
export default ReviewAppStore;
