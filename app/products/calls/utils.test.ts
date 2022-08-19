// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {getICEServersConfigs} from './utils';

describe('getICEServersConfigs', () => {
    it('backwards compatible case, no ICEServersConfigs present', () => {
        const config = {
            ICEServers: ['stun:stun.example.com:3478'],
            AllowEnableCalls: true,
            DefaultEnabled: true,
            NeedsTURNCredentials: false,
            last_retrieved_at: 0,
        };
        const iceConfigs = getICEServersConfigs(config);

        assert.deepEqual(iceConfigs, [
            {
                urls: ['stun:stun.example.com:3478'],
            },
        ]);
    });

    it('ICEServersConfigs set', () => {
        const config = {
            ICEServersConfigs: [
                {
                    urls: ['stun:stun.example.com:3478'],
                },
                {
                    urls: ['turn:turn.example.com:3478'],
                },
            ],
            AllowEnableCalls: true,
            DefaultEnabled: true,
            NeedsTURNCredentials: false,
            last_retrieved_at: 0,
        };
        const iceConfigs = getICEServersConfigs(config);

        assert.deepEqual(iceConfigs, [
            {
                urls: ['stun:stun.example.com:3478'],
            },
            {
                urls: ['turn:turn.example.com:3478'],
            },
        ]);
    });

    it('Both ICEServers and ICEServersConfigs set', () => {
        const config = {
            ICEServers: ['stun:stuna.example.com:3478'],
            ICEServersConfigs: [
                {
                    urls: ['stun:stunb.example.com:3478'],
                },
                {
                    urls: ['turn:turn.example.com:3478'],
                },
            ],
            AllowEnableCalls: true,
            DefaultEnabled: true,
            NeedsTURNCredentials: false,
            last_retrieved_at: 0,
        };
        const iceConfigs = getICEServersConfigs(config);

        assert.deepEqual(iceConfigs, [
            {
                urls: ['stun:stunb.example.com:3478'],
            },
            {
                urls: ['turn:turn.example.com:3478'],
            },
        ]);
    });
});
