// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import thunk, {ThunkMiddleware} from 'redux-thunk';

import createActionBuffer from 'redux-action-buffer';
import {REHYDRATE} from 'redux-persist/constants';

const defaultOptions = {
    additionalMiddleware: [],
    enableBuffer: true,
    enableThunk: true,
};
export function createMiddleware(clientOptions: any): ThunkMiddleware[] {
    const options = Object.assign({}, defaultOptions, clientOptions);
    const {
        additionalMiddleware,
        enableBuffer,
        enableThunk,
    } = options;
    const middleware: ThunkMiddleware[] = [];

    if (enableThunk) {
        middleware.push(thunk);
    }

    if (additionalMiddleware) {
        if (typeof additionalMiddleware === 'function') {
            middleware.push(additionalMiddleware);
        } else {
            middleware.push(...additionalMiddleware);
        }
    }

    if (enableBuffer) {
        middleware.push(createActionBuffer(REHYDRATE));
    }

    return middleware;
}
