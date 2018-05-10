// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import DeviceInfo from 'react-native-device-info';

import {ViewTypes} from 'app/constants';
import {messageRetention} from 'app/store/middleware';

jest.mock('react-native-fetch-blob', () => {
  return {
    DocumentDir: () => {},
    polyfill: () => {},
    fs: {
        dirs: {
        },
    },
  }
});

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
                    const next = (action) => action;

                    nextAction = messageRetention(store)(next)(action);
                    assert.equal(action.type, nextAction.type);
                });
            });
        });
    });
});
