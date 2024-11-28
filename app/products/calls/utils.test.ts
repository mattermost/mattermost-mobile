// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {type CallsConfigState, DefaultCallsConfig} from '@calls/types/calls';
import {License} from '@constants';

import {getICEServersConfigs, getCallPropsFromPost} from './utils';

describe('getICEServersConfigs', () => {
    it('backwards compatible case, no ICEServersConfigs present', () => {
        const config: CallsConfigState = {
            ...DefaultCallsConfig,
            pluginEnabled: true,
            ICEServers: ['stun:stun.example.com:3478'],
            ICEServersConfigs: [],
            AllowEnableCalls: true,
            DefaultEnabled: true,
            NeedsTURNCredentials: false,
            last_retrieved_at: 0,
            sku_short_name: License.SKU_SHORT_NAME.Professional,
            MaxCallParticipants: 8,
            EnableRecordings: true,
        };
        const iceConfigs = getICEServersConfigs(config);

        assert.deepEqual(iceConfigs, [
            {
                urls: ['stun:stun.example.com:3478'],
            },
        ]);
    });

    it('ICEServersConfigs set', () => {
        const config: CallsConfigState = {
            ...DefaultCallsConfig,
            pluginEnabled: true,
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
            sku_short_name: License.SKU_SHORT_NAME.Professional,
            MaxCallParticipants: 8,
            EnableRecordings: true,
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
        const config: CallsConfigState = {
            ...DefaultCallsConfig,
            pluginEnabled: true,
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
            sku_short_name: License.SKU_SHORT_NAME.Professional,
            MaxCallParticipants: 8,
            EnableRecordings: true,
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

describe('getCallPropsFromPost', () => {
    test('undefined props', () => {
        const post = {} as Post;

        const props = getCallPropsFromPost(post);

        expect(props.title).toBe('');
        expect(props.start_at).toBe(0);
        expect(props.end_at).toBe(0);
        expect(props.recordings).toStrictEqual({});
        expect(props.recording_files.length).toBe(0);
        expect(props.transcriptions).toStrictEqual({});
        expect(props.participants.length).toBe(0);
    });

    test('missing props', () => {
        const post = {
            props: {},
        } as Post;

        const props = getCallPropsFromPost(post);

        expect(props.title).toBe('');
        expect(props.start_at).toBe(0);
        expect(props.end_at).toBe(0);
        expect(props.recordings).toStrictEqual({});
        expect(props.recording_files.length).toBe(0);
        expect(props.transcriptions).toStrictEqual({});
        expect(props.participants.length).toBe(0);
    });

    test('invalid props', () => {
        const callProps = {
            title: {},
            start_at: 'invalid',
            end_at: [],
            recordings: null,
            transcriptions: 45,
            participants: 'invalid',
            recording_files: 45,
        };

        const post = {
            props: callProps as unknown,
        } as Post;

        const props = getCallPropsFromPost(post);

        expect(props.title).toBe('');
        expect(props.start_at).toBe(0);
        expect(props.end_at).toBe(0);
        expect(props.recordings).toStrictEqual({});
        expect(props.recording_files.length).toBe(0);
        expect(props.transcriptions).toStrictEqual({});
        expect(props.participants.length).toBe(0);
    });

    test('full props', () => {
        const callProps = {
            title: 'call title',
            start_at: 1000,
            end_at: 1045,
            recordings: {
                recA: {
                    file_id: 'recAFileID',
                    post_id: 'recAPostID',
                    tr_id: 'trA',
                },
                recB: {
                    file_id: 'recBFileID',
                    post_id: 'recBPostID',
                    tr_id: 'trB',
                },
            },
            recording_files: ['recAFileID', 'recBFileID'],
            transcriptions: {
                trA: {
                    file_id: 'trAFileID',
                    post_id: 'trAPostID',
                    rec_id: 'recA',
                },
                trB: {
                    file_id: 'trBFileID',
                    post_id: 'trBPostID',
                    rec_id: 'recB',
                },
            },
            participants: ['userA', 'userB'],
        };

        const post = {
            props: callProps as unknown,
        } as Post;

        const props = getCallPropsFromPost(post);

        expect(props.title).toBe(post.props?.title);
        expect(props.start_at).toBe(post.props?.start_at);
        expect(props.end_at).toBe(post.props?.end_at);
        expect(props.recordings).toBe(post.props?.recordings);
        expect(props.recording_files).toBe(post.props?.recording_files);
        expect(props.transcriptions).toBe(post.props?.transcriptions);
        expect(props.participants).toBe(post.props?.participants);
    });
});
