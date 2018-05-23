// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable max-nested-callbacks */

import assert from 'assert';

import {ViewTypes} from 'app/constants';
import {messageRetention} from 'app/store/middleware';

jest.mock('react-native-fetch-blob/fs', () => ({
    dirs: {
        DocumentDir: () => jest.fn(),
        CacheDir: () => jest.fn(),
    },
}));

jest.mock('react-native-device-info', () => {
    return {
        getVersion: () => '0.0.0',
        getBuildNumber: () => '0',
    };
});

describe('store/middleware', () => {
    describe('messageRetention', () => {
        describe('should chain the same incoming action type', () => {
            const actions = [
                {
                    type: 'persist/REHYDRATE',
                    payload: {
                        views: {
                            team: {
                            },
                        },
                    },
                },
                {
                    type: ViewTypes.DATA_CLEANUP,
                    payload: {
                        entities: {
                            channels: {
                            },
                            posts: {
                            },
                        },
                        views: {
                            team: {
                            },
                        },
                    },
                },
                {
                    type: 'other',
                },
            ];

            actions.forEach((action) => {
                it(`for action type ${action.type}`, () => {
                    const store = {};
                    const next = (a) => a;

                    const nextAction = messageRetention(store)(next)(action);
                    assert.equal(action.type, nextAction.type);
                });
            });
        });
    });
});
