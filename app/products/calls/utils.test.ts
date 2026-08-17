// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {Alert} from 'react-native';
import {SelectedTrackType} from 'react-native-video';

import {CallCardState, CallPostStatus, type CallsConfigState, type CallsPostProps, DefaultCallsConfig} from '@calls/types/calls';
import {License, Post, Preferences} from '@constants';
import {NOTIFICATION_SUB_TYPE} from '@constants/push_notification';
import TestHelper from '@test/test_helper';

import {
    getICEServersConfigs,
    getCallCardState,
    getCallPropsFromPost,
    sortSessions,
    getHandsRaised,
    getHandsRaisedNames,
    hasOtherUserJoined,
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
                userModel: TestHelper.fakeUserModel({username: 'charlie'}),
            },
            2: {
                sessionId: '2',
                userId: 'user2',
                muted: true,
                raisedHand: 0,
                userModel: TestHelper.fakeUserModel({username: 'alice'}),
            },
            3: {
                sessionId: '3',
                userId: 'user3',
                muted: true,
                raisedHand: 0,
                userModel: TestHelper.fakeUserModel({username: 'bob'}),
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
                userModel: TestHelper.fakeUserModel({username: 'a'}),
            },
            2: {
                sessionId: '2',
                userId: 'user2',
                muted: false,
                raisedHand: 0,
                userModel: TestHelper.fakeUserModel({username: 'b'}),
            },
            3: {
                sessionId: '3',
                userId: 'user3',
                muted: true,
                raisedHand: 1000,
                userModel: TestHelper.fakeUserModel({username: 'c'}),
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
                userModel: TestHelper.fakeUserModel({username: 'a'}),
            },
            2: {
                sessionId: '2',
                userId: 'user2',
                muted: true,
                raisedHand: 1000, // Raised hand first
                userModel: TestHelper.fakeUserModel({username: 'b'}),
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

describe('hasOtherUserJoined', () => {
    const mySession = {sessionId: '1', userId: 'me', muted: true, raisedHand: 0};

    it('returns false when only the same user has multiple sessions in the call', () => {
        const sessions = {
            1: mySession,
            2: {sessionId: '2', userId: 'me', muted: true, raisedHand: 0},
        };

        expect(hasOtherUserJoined(sessions, 'me')).toBe(false);
    });

    it('returns true when another user is in the call', () => {
        const sessions = {
            1: mySession,
            2: {sessionId: '2', userId: 'user2', muted: true, raisedHand: 0},
        };

        expect(hasOtherUserJoined(sessions, 'me')).toBe(true);
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
                userModel: TestHelper.fakeUserModel({username: 'alice'}),
                muted: false,
            },
            {
                sessionId: '2',
                userId: 'user2',
                raisedHand: 1000,
                userModel: TestHelper.fakeUserModel({username: 'bob'}),
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
                userModel: TestHelper.fakeUserModel({username: 'alice'}),
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
        expect(isCallsCustomMessage(TestHelper.fakePost({type: Post.POST_TYPES.CUSTOM_CALLS}))).toBe(true);
        expect(isCallsCustomMessage(TestHelper.fakePost({type: ''}))).toBe(false); // Regular post
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
            ...Preferences.THEMES.denim,
            sidebarBg: '#000000',
        };

        const callsTheme = makeCallsTheme(theme);

        expect(callsTheme.callsBg).toBeDefined();
        expect(callsTheme.callsBgRgb).toBeDefined();
        expect(callsTheme.callsBadgeBg).toBeDefined();
    });
});

describe('isCallsStartedMessage', () => {
    it('identifies calls notifications', () => {
        expect(isCallsStartedMessage({sub_type: NOTIFICATION_SUB_TYPE.CALLS} as NotificationData)).toBe(true);
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
        const post = TestHelper.fakePost({props: undefined});

        const props = getCallPropsFromPost(post);

        expect(props.title).toBe('');
        expect(props.start_at).toBe(0);
        expect(props.end_at).toBe(0);
        expect(props.call_status).toBe('');
        expect(props.recordings).toStrictEqual({});
        expect(props.transcriptions).toStrictEqual({});
        expect(props.participants.length).toBe(0);
    });

    test('missing props', () => {
        const post = TestHelper.fakePost({props: {}});

        const props = getCallPropsFromPost(post);

        expect(props.title).toBe('');
        expect(props.start_at).toBe(0);
        expect(props.end_at).toBe(0);
        expect(props.call_status).toBe('');
        expect(props.recordings).toStrictEqual({});
        expect(props.transcriptions).toStrictEqual({});
        expect(props.participants.length).toBe(0);
    });

    test('invalid props', () => {
        const callProps = {
            title: {},
            start_at: 'invalid',
            end_at: [],
            call_status: 'not_a_status',
            recordings: null,
            transcriptions: 45,
            participants: 'invalid',
        };

        const post = TestHelper.fakePost({
            props: callProps,
        });

        const props = getCallPropsFromPost(post);

        expect(props.title).toBe('');
        expect(props.start_at).toBe(0);
        expect(props.end_at).toBe(0);
        expect(props.call_status).toBe('');
        expect(props.recordings).toStrictEqual({});
        expect(props.transcriptions).toStrictEqual({});
        expect(props.participants.length).toBe(0);
    });

    test('full props', () => {
        const callProps = {
            title: 'call title',
            start_at: 1000,
            end_at: 1045,
            call_status: 'no_answer',
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

        const post = TestHelper.fakePost({
            props: callProps,
        });

        const props = getCallPropsFromPost(post);

        expect(props.title).toBe(post.props?.title);
        expect(props.start_at).toBe(post.props?.start_at);
        expect(props.end_at).toBe(post.props?.end_at);
        expect(props.call_status).toBe(post.props?.call_status);
        expect(props.recordings).toBe(post.props?.recordings);
        expect(props.transcriptions).toBe(post.props?.transcriptions);
        expect(props.participants).toBe(post.props?.participants);
    });
});

describe('getCallCardState', () => {
    const makeCallProps = (overrides: Partial<CallsPostProps> = {}): CallsPostProps => ({
        title: '',
        start_at: 1000,
        end_at: 0,
        call_status: '',
        recordings: {},
        transcriptions: {},
        participants: [],
        ...overrides,
    });

    it('should be calling when the call is ringing and only the caller is connected', () => {
        expect(getCallCardState(makeCallProps({call_status: CallPostStatus.Calling}), 1, false)).toBe(CallCardState.Calling);
    });

    it('should be active once the callee answers, even though call_status is still calling', () => {
        expect(getCallCardState(makeCallProps({call_status: CallPostStatus.Calling}), 2, false)).toBe(CallCardState.Active);
    });

    it('should be active for an ongoing call with no call_status', () => {
        expect(getCallCardState(makeCallProps(), 2, false)).toBe(CallCardState.Active);
    });

    it('should be ended once the call is torn down, before the post has an end_at', () => {
        expect(getCallCardState(makeCallProps({call_status: CallPostStatus.Calling}), 1, true)).toBe(CallCardState.Ended);
    });

    it('should be no answer for a call that timed out while ringing', () => {
        expect(getCallCardState(makeCallProps({end_at: 31000, call_status: CallPostStatus.NoAnswer}), 0, true)).toBe(CallCardState.NoAnswer);
    });

    it('should be canceled for a call the caller hung up while ringing', () => {
        expect(getCallCardState(makeCallProps({end_at: 3000, call_status: CallPostStatus.CanceledByCaller}), 0, true)).toBe(CallCardState.Canceled);
    });

    it('should be ended for a call that was answered and then hung up', () => {
        expect(getCallCardState(makeCallProps({end_at: 500000, call_status: CallPostStatus.Ended}), 0, true)).toBe(CallCardState.Ended);
    });

    it('should be ended for an ended call with an unhandled status, such as declined', () => {
        expect(getCallCardState(makeCallProps({end_at: 3000, call_status: ''}), 0, true)).toBe(CallCardState.Ended);
    });
});
