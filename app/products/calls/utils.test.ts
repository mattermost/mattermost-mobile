// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {Alert} from 'react-native';
import {SelectedTrackType} from 'react-native-video';

import {type CallsConfigState, DefaultCallsConfig} from '@calls/types/calls';
import {License, Post} from '@constants';
import {NOTIFICATION_SUB_TYPE} from '@constants/push_notification';

import {
    getICEServersConfigs,
    getCallPropsFromPost,
    sortSessions,
    getHandsRaised,
    getHandsRaisedNames,
    isSupportedServerCalls,
    isHostControlsAllowed,
    areGroupCallsAllowed,
    isCallsCustomMessage,
    idsAreEqual,
    errorAlert,
    makeCallsTheme,
    isCallsStartedMessage,
    hasCaptions,
    getTranscriptionUri,
} from './utils';

import type UserModel from '@typings/database/models/servers/user';
import type {IntlShape} from 'react-intl';

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

describe('sortSessions', () => {
    const locale = 'en';
    const teammateNameDisplay = 'username';

    it('returns empty array for undefined sessions', () => {
        expect(sortSessions(locale, teammateNameDisplay, undefined)).toEqual([]);
    });

    it('sorts by name', () => {
        const sessions = {
            1: {
                sessionId: '1',
                userId: 'user1',
                muted: true,
                raisedHand: 0,
                userModel: {username: 'charlie'} as UserModel,
            },
            2: {
                sessionId: '2',
                userId: 'user2',
                muted: true,
                raisedHand: 0,
                userModel: {username: 'alice'} as UserModel,
            },
            3: {
                sessionId: '3',
                userId: 'user3',
                muted: true,
                raisedHand: 0,
                userModel: {username: 'bob'} as UserModel,
            },
        };

        const sorted = sortSessions(locale, teammateNameDisplay, sessions);
        expect(sorted.map((s) => s.userModel?.username)).toEqual(['alice', 'bob', 'charlie']);
    });

    it('sorts by state (presenter > raised hand > unmuted)', () => {
        const sessions = {
            1: {
                sessionId: '1',
                userId: 'user1',
                muted: true,
                raisedHand: 0,
                userModel: {username: 'a'} as UserModel,
            },
            2: {
                sessionId: '2',
                userId: 'user2',
                muted: false,
                raisedHand: 0,
                userModel: {username: 'b'} as UserModel,
            },
            3: {
                sessionId: '3',
                userId: 'user3',
                muted: true,
                raisedHand: 1000,
                userModel: {username: 'c'} as UserModel,
            },
        };

        const sorted = sortSessions(locale, teammateNameDisplay, sessions, '2');
        expect(sorted.map((s) => s.userModel?.username)).toEqual(['b', 'c', 'a']);
    });

    it('sorts by raised hand timestamp when multiple hands are raised', () => {
        const sessions = {
            1: {
                sessionId: '1',
                userId: 'user1',
                muted: true,
                raisedHand: 2000, // Raised hand second
                userModel: {username: 'a'} as UserModel,
            },
            2: {
                sessionId: '2',
                userId: 'user2',
                muted: true,
                raisedHand: 1000, // Raised hand first
                userModel: {username: 'b'} as UserModel,
            },
        };

        const sorted = sortSessions(locale, teammateNameDisplay, sessions);
        expect(sorted.map((s) => s.userModel?.username)).toEqual(['b', 'a']);
    });
});

describe('getHandsRaised', () => {
    it('returns sessions with raised hands', () => {
        const sessions = {
            1: {
                sessionId: '1',
                userId: 'user1',
                muted: true,
                raisedHand: 0,
            },
            2: {
                sessionId: '2',
                userId: 'user2',
                muted: true,
                raisedHand: 1000,
            },
            3: {
                sessionId: '3',
                userId: 'user3',
                muted: true,
                raisedHand: 2000,
            },
        };

        const raised = getHandsRaised(sessions);
        expect(raised.length).toBe(2);
        expect(raised.map((s) => s.sessionId).sort()).toEqual(['2', '3']);
    });
});

describe('getHandsRaisedNames', () => {
    const locale = 'en';
    const teammateNameDisplay = 'username';
    const intl = {
        formatMessage: ({id}: {id: string}) => (id === 'mobile.calls_you_2' ? 'You' : id),
    } as IntlShape;

    it('returns names in order of raised hand time', () => {
        const sessions = [
            {
                sessionId: '1',
                userId: 'user1',
                raisedHand: 2000,
                userModel: {username: 'alice'} as UserModel,
                muted: false,
            },
            {
                sessionId: '2',
                userId: 'user2',
                raisedHand: 1000,
                userModel: {username: 'bob'} as UserModel,
                muted: false,
            },
        ];

        const names = getHandsRaisedNames(sessions, '3', locale, teammateNameDisplay, intl);
        expect(names).toEqual(['bob', 'alice']);
    });

    it('shows "You" for current user', () => {
        const sessions = [
            {
                sessionId: '1',
                userId: 'user1',
                raisedHand: 1000,
                userModel: {username: 'alice'} as UserModel,
                muted: false,
            },
        ];

        const names = getHandsRaisedNames(sessions, '1', locale, teammateNameDisplay, intl);
        expect(names).toEqual(['You']);
    });
});

describe('isSupportedServerCalls', () => {
    it('returns false for undefined version', () => {
        expect(isSupportedServerCalls(undefined)).toBe(false);
    });

    it('returns true for supported version', () => {
        expect(isSupportedServerCalls('7.6.0')).toBe(true);
    });

    it('returns false for unsupported version', () => {
        expect(isSupportedServerCalls('6.2.0')).toBe(false);
    });
});

describe('isHostControlsAllowed and areGroupCallsAllowed', () => {
    const config: CallsConfigState = {
        ...DefaultCallsConfig,
        HostControlsAllowed: true,
        GroupCallsAllowed: true,
    };

    it('returns config values', () => {
        expect(isHostControlsAllowed(config)).toBe(true);
        expect(areGroupCallsAllowed(config)).toBe(true);
    });

    it('returns false for undefined values', () => {
        expect(isHostControlsAllowed({} as CallsConfigState)).toBe(false);
        expect(areGroupCallsAllowed({} as CallsConfigState)).toBe(false);
    });
});

describe('isCallsCustomMessage', () => {
    it('identifies calls messages', () => {
        expect(isCallsCustomMessage({type: Post.POST_TYPES.CUSTOM_CALLS} as Post)).toBe(true);
        expect(isCallsCustomMessage({type: 'regular_post' as unknown} as Post)).toBe(false);
        expect(isCallsCustomMessage({} as Post)).toBe(false);
    });
});

describe('idsAreEqual', () => {
    it('compares arrays of ids', () => {
        expect(idsAreEqual(['1', '2', '3'], ['1', '2', '3'])).toBe(true);
        expect(idsAreEqual(['1', '2', '3'], ['3', '2', '1'])).toBe(true);
        expect(idsAreEqual(['1', '2'], ['1', '2', '3'])).toBe(false);
        expect(idsAreEqual(['1', '2', '3'], ['1', '2'])).toBe(false);
        expect(idsAreEqual(['1', '2', '3'], ['4', '5', '6'])).toBe(false);
    });
});

describe('errorAlert', () => {
    it('shows error alert', () => {
        const mockAlert = jest.spyOn(Alert, 'alert');
        const intl = {
            formatMessage: ({defaultMessage}: {defaultMessage: string}, values?: any) => {
                if (values) {
                    return defaultMessage.replace('{error}', values.error);
                }
                return defaultMessage;
            },
        } as IntlShape;

        errorAlert('test error', intl);

        expect(mockAlert).toHaveBeenCalledWith(
            'Error',
            'Error: test error',
        );
    });
});

describe('makeCallsTheme', () => {
    it('creates calls theme from base theme', () => {
        const theme = {
            sidebarBg: '#000000',
        } as Theme;

        const callsTheme = makeCallsTheme(theme);

        expect(callsTheme.callsBg).toBeDefined();
        expect(callsTheme.callsBgRgb).toBeDefined();
        expect(callsTheme.callsBadgeBg).toBeDefined();
    });
});

describe('isCallsStartedMessage', () => {
    it('identifies calls notifications', () => {
        expect(isCallsStartedMessage({sub_type: NOTIFICATION_SUB_TYPE.CALLS} as NotificationData)).toBe(true);
        expect(isCallsStartedMessage({message: "You've been invited to a call"} as NotificationData)).toBe(true);
        expect(isCallsStartedMessage({message: '\u200bUser is inviting you to a call'} as NotificationData)).toBe(true);
        expect(isCallsStartedMessage({message: 'regular message'} as NotificationData)).toBe(false);
    });
});

describe('hasCaptions', () => {
    it('checks for valid captions', () => {
        expect(hasCaptions({captions: [{title: 'test', language: 'en', file_id: '123'}]})).toBe(true);
        expect(hasCaptions({captions: []})).toBe(false);
        expect(hasCaptions({})).toBe(false);
        expect(hasCaptions(undefined)).toBe(false);
    });
});

describe('getTranscriptionUri', () => {
    const serverUrl = 'https://example.com';

    it('returns empty track when no captions', () => {
        const result = getTranscriptionUri(serverUrl, {});
        expect(result.tracks).toBeUndefined();
        expect(result.selected).toEqual({type: SelectedTrackType.DISABLED, value: ''});
    });

    it('returns track info when captions exist', () => {
        const props = {
            captions: [{
                title: 'English',
                language: 'en',
                file_id: '123',
            }],
        };

        const result = getTranscriptionUri(serverUrl, props);

        expect(result.tracks).toBeDefined();
        expect(result.tracks?.length).toBe(1);
        expect(result.selected).toEqual({type: SelectedTrackType.INDEX, value: 0});
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
