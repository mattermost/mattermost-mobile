// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';

import type {ShowSnackBarArgs} from '@utils/snack_bar';

type SnackBarState = {
    visible: boolean;
    config: ShowSnackBarArgs | null;
};

class SnackBarStoreSingleton {
    private subject = new BehaviorSubject<SnackBarState>({
        visible: false,
        config: null,
    });

    show = (config: ShowSnackBarArgs) => {
        this.subject.next({visible: true, config});
    };

    dismiss = () => {
        this.subject.next({visible: false, config: null});
    };

    observe = () => {
        return this.subject.asObservable();
    };

    getState = () => {
        return this.subject.value;
    };
}

const SnackBarStore = new SnackBarStoreSingleton();
export default SnackBarStore;
