// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Sentry} from 'react-native-sentry';
import {BATCH} from 'redux-batched-actions';

export const BREADCRUMB_REDUX_ACTION = 'redux-action';

export function createSentryMiddleware() {
    return (store) => { // eslint-disable-line no-unused-vars
        return (next) => {
            return (action) => {
                Sentry.captureBreadcrumb(makeBreadcrumbFromAction(action));

                return next(action);
            };
        };
    };
}

function makeBreadcrumbFromAction(action) {
    const breadcrumb = {
        category: BREADCRUMB_REDUX_ACTION,
        message: action.type,
    };

    if (action.type === BATCH) {
        // Attach additional information so that batched actions display what they're doing
        breadcrumb.data = action.payload.map((a) => a.type);
    }

    if (action.type === BATCH) {
        // Attach additional information so that batched actions display what they're doing, and make it
        // into an object because that's what is expected
        breadcrumb.data = {};

        action.payload.forEach((a, index) => {
            breadcrumb.data[index] = a.type;
        });
    }

    return breadcrumb;
}
