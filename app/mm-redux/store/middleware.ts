// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import thunk, {ThunkMiddleware} from 'redux-thunk';

import createActionBuffer from 'redux-action-buffer';
import {PERSIST} from 'redux-persist';
import {General} from '@mm-redux/constants';

export function createMiddleware(clientOptions: any): ThunkMiddleware[] {
    const {
        additionalMiddleware,
        enableBuffer,
        enableThunk,
    } = clientOptions;
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
        middleware.push(createActionBuffer({breaker: General.REHYDRATED, passthrough: [PERSIST]}));
    }

    return middleware;
}
