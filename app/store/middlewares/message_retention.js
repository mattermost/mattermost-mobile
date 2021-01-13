// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DeviceInfo from 'react-native-device-info';
import {REHYDRATE} from 'redux-persist';

import {ViewTypes} from '@constants';
import {
    captureException,
    LOGGER_JAVASCRIPT_WARNING,
} from '@utils/sentry';

import {cleanUpState} from './helpers';

export default function messageRetention(store) {
    return (next) => (action) => {
        if (action.type === REHYDRATE) {
            if (!action.payload) {
                // On first run payload is not set (when installed)
                action.payload = {
                    _persist: {
                        rehydrated: true,
                    },
                };
            }

            const {app} = action.payload;
            const {entities, views} = action.payload;

            const build = DeviceInfo.getBuildNumber();
            const version = DeviceInfo.getVersion();
            const previousVersion = app?.version;

            action.payload = {
                ...action.payload,
                app: {
                    build,
                    version,
                    previousVersion,
                },
            };

            if (!entities || !views) {
                return next(action);
            }

            // Keep only the last 60 messages for the last 5 viewed channels in each team
            // and apply data retention on those posts if applies
            try {
                action.payload = cleanUpState(action.payload);
            } catch (e) {
                // Sometimes, the payload is incomplete so log the error to Sentry and skip the cleanup
                console.warn(e); // eslint-disable-line no-console
                captureException(e, LOGGER_JAVASCRIPT_WARNING, store);
            }

            return next(action);
        } else if (action.type === ViewTypes.DATA_CLEANUP) {
            action.payload = cleanUpState(action.payload, true);
            return next(action);
        }

        /* Uncomment the following lines to log the actions being dispatched */
        // if (action.type === 'BATCHING_REDUCER.BATCH') {
        //     action.payload.forEach((p) => {
        //         console.log('BATCHED ACTIONS', p.type);
        //     });
        // } else {
        //     console.log('ACTION', action.type);
        // }

        return next(action);
    };
}
