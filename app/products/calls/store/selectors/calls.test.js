// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import deepFreezeAndThrowOnMutation from '@mm-redux/utils/deep_freeze';
import {DefaultServerConfig} from '@mmproducts/calls/store/types/calls';

import * as Selectors from './calls';

describe('Selectors.Calls', () => {
    const call1 = {id: 'call1', participants: [{id: 'me'}]};
    const call2 = {id: 'call2'};
    const testState = deepFreezeAndThrowOnMutation({
        entities: {
            channels: {
                currentChannelId: 'channel-1',
            },
            calls: {
                calls: {call1, call2},
                joined: 'call1',
                enabled: {'channel-1': true, 'channel-2': false},
                screenShareURL: 'screenshare-url',
                config: DefaultServerConfig,
            },
            general: {
                license: {},
            },
        },
    });

    it('getCalls', () => {
        assert.deepEqual(Selectors.getCalls(testState), {call1, call2});
    });

    it('getCurrentCall', () => {
        assert.deepEqual(Selectors.getCurrentCall(testState), call1);
        let newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    joined: null,
                },
            },
        };
        assert.equal(Selectors.getCurrentCall(newState), null);
        newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    joined: 'invalid-id',
                },
            },
        };
        assert.equal(Selectors.getCurrentCall(newState), null);
    });

    it('isCallsEnabled', () => {
        assert.equal(Selectors.isCallsExplicitlyEnabled(testState), true);
        let newState = {
            ...testState,
            entities: {
                ...testState.entities,
                channels: {currentChannelId: 'channel-2'},
            },
        };
        assert.equal(Selectors.isCallsExplicitlyEnabled(newState), false);
        newState = {
            ...testState,
            entities: {
                ...testState.entities,
                channels: {currentChannelId: 'not-valid-channel'},
            },
        };
        assert.equal(Selectors.isCallsExplicitlyEnabled(newState), false);
    });

    it('getScreenShareURL', () => {
        assert.equal(Selectors.getScreenShareURL(testState), 'screenshare-url');
    });

    it('isLimitRestricted', () => {
        // Default, no limit
        assert.equal(Selectors.isLimitRestricted(testState, 'call1'), false);

        let newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    config: {
                        ...testState.entities.calls.config,
                        MaxCallParticipants: 1,
                    },
                },
            },
        };

        // Limit to 1 and one participant already in call.
        assert.equal(Selectors.isLimitRestricted(newState, 'call1'), true);

        // Limit to 1 but no call ongoing.
        assert.equal(Selectors.isLimitRestricted(newState), false);

        newState = {
            ...testState,
            entities: {
                ...testState.entities,
                general: {
                    license: {Cloud: 'true'},
                },
            },
        };

        // On cloud, no limit.
        assert.equal(Selectors.isLimitRestricted(newState, 'call1'), false);

        newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    config: {
                        ...testState.entities.calls.config,
                        MaxCallParticipants: 1,
                    },
                },
                general: {
                    license: {Cloud: 'true'},
                },
            },
        };

        // On cloud, with limit.
        assert.equal(Selectors.isLimitRestricted(newState, 'call1'), true);

        const call = {id: 'call1',
            participants: [
                {},
                {},
                {},
                {},
                {},
                {},
                {},
            ]};
        newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    calls: {call1: call},
                },
                general: {
                    license: {Cloud: 'true'},
                },
            },
        };
        delete newState.entities.calls.config.MaxCallParticipants;

        // On cloud, MaxCallParticipants missing, default should be used.
        assert.equal(Selectors.isLimitRestricted(newState, 'call1'), false);

        const newCall = {id: 'call1',
            participants: [
                {},
                {},
                {},
                {},
                {},
                {},
                {},
                {},
            ]};
        newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    calls: {call1: newCall},
                },
                general: {
                    license: {Cloud: 'true'},
                },
            },
        };
        delete newState.entities.calls.config.MaxCallParticipants;

        // On cloud, MaxCallParticipants missing, default should be used.
        assert.equal(Selectors.isLimitRestricted(newState, 'call1'), true);
    });

    it('getICEServersConfigs', () => {
        assert.deepEqual(Selectors.getICEServersConfigs(testState), []);

        // backwards compatible case, no ICEServersConfigs present.
        let newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    config: {
                        ...testState.entities.calls.config,
                        ICEServers: ['stun:stun1.example.com'],
                    },
                },
            },
        };
        assert.deepEqual(Selectors.getICEServersConfigs(newState), [{urls: ['stun:stun1.example.com']}]);

        // ICEServersConfigs defined case
        newState = {
            ...testState,
            entities: {
                ...testState.entities,
                calls: {
                    ...testState.entities.calls,
                    config: {
                        ...testState.entities.calls.config,
                        ICEServers: ['stun:stun1.example.com'],
                        ICEServersConfigs: [
                            {urls: 'stun:stun1.example.com'},
                            {urls: 'turn:turn.example.com', username: 'username', credentail: 'password'},
                        ],
                    },
                },
            },
        };
        assert.deepEqual(Selectors.getICEServersConfigs(newState), [
            {urls: 'stun:stun1.example.com'},
            {urls: 'turn:turn.example.com', username: 'username', credentail: 'password'},
        ]);
    });
});
