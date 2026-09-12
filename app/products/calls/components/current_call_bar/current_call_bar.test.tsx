// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {muteMyself, unmuteMyself} from '@calls/actions';
import {leaveCallConfirmation} from '@calls/actions/calls';
import CallAvatar from '@calls/components/call_avatar';
import {DefaultCurrentCall, type CallSession} from '@calls/types/calls';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {CurrentCallBar} from './current_call_bar';

jest.mock('@calls/actions', () => ({
    muteMyself: jest.fn(),
    unmuteMyself: jest.fn(),
}));

jest.mock('@calls/actions/calls', () => ({
    leaveCallConfirmation: jest.fn(),
}));

jest.mock('@calls/alerts', () => ({
    recordingAlert: jest.fn(),
    recordingWillBePostedAlert: jest.fn(),
    recordingErrorAlert: jest.fn(),
}));

jest.mock('@calls/state', () => ({
    setCallQualityAlertDismissed: jest.fn(),
    setMicPermissionsErrorDismissed: jest.fn(),
    useCallsConfig: () => ({EnableTranscriptions: false}),
}));

jest.mock('@calls/hooks', () => ({
    ...jest.requireActual('@calls/hooks'),
    usePermissionsChecker: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://test.server.com',
}));

jest.mock('@screens/navigation', () => ({
    navigateToScreen: jest.fn(),
}));

// Mocked so the tests can assert whose avatar the bar decided to show.
jest.mock('@calls/components/call_avatar');
jest.mocked(CallAvatar).mockImplementation((props) => React.createElement('CallAvatar', {
    ...props,
    testID: 'call-avatar',
    userId: props.userModel?.id ?? '',
}));

describe('CurrentCallBar', () => {
    const now = new Date('2026-01-01T12:00:00Z').getTime();
    const callee = TestHelper.fakeUserModel({id: 'callee-id', username: 'callee'});
    const speaker = TestHelper.fakeUserModel({id: 'speaker-id', username: 'speaker'});

    const speakerSession: CallSession = {
        sessionId: 'speaker-session',
        userId: speaker.id,
        muted: false,
        raisedHand: 0,
        video: false,
        userModel: speaker,
    };

    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function getBaseProps(): ComponentProps<typeof CurrentCallBar> {
        return {
            displayName: 'Test Channel',
            currentCall: {
                ...DefaultCurrentCall,
                connected: true,
                serverUrl: 'https://test.server.com',
                myUserId: 'my-id',
                mySessionId: 'my-session',
                channelId: 'channel-id',
                startTime: now - 65000,
                sessions: {'speaker-session': speakerSession},
            },
            sessionsDict: {},
            teammateNameDisplay: 'username',
            micPermissionsGranted: true,
            otherParticipants: false,
            isAdmin: false,
            isHost: true,
            isDMCall: false,
            isDMConnecting: false,
            isDMCalling: false,
            dmCallee: undefined,
            dmCalleeAnsweredAt: 0,
        };
    }

    function getCallingProps(): ComponentProps<typeof CurrentCallBar> {
        return {
            ...getBaseProps(),
            isDMCall: true,
            isDMCalling: true,
            dmCallee: callee,
            dmCalleeAnsweredAt: 0,
        };
    }

    // Placing the call: the caller collapsed the call screen before the call connected.
    function getConnectingProps(): ComponentProps<typeof CurrentCallBar> {
        const baseProps = getBaseProps();
        return {
            ...baseProps,
            currentCall: {...DefaultCurrentCall, ...baseProps.currentCall, connected: false, startedByMe: true, mySessionId: '', sessions: {}, startTime: 0},
            isDMCall: true,
            isDMConnecting: true,
            dmCallee: callee,
        };
    }

    it('should show the callee and Connecting while the call is being placed', () => {
        const {getByTestId, queryByText} = renderWithIntlAndTheme(<CurrentCallBar {...getConnectingProps()}/>);

        expect(getByTestId('calls.connecting_text')).toHaveTextContent('Connecting...');
        expect(getByTestId('call-avatar').props.userId).toBe(callee.id);
        expect(queryByText('No one is talking')).toBeNull();
    });

    it('should not act on the call controls while the call is being placed, since there is no connection yet', () => {
        const {getByTestId} = renderWithIntlAndTheme(<CurrentCallBar {...getConnectingProps()}/>);

        fireEvent.press(getByTestId('calls.current_call_bar.mute'));
        fireEvent.press(getByTestId('calls.current_call_bar.leave'));

        expect(muteMyself).not.toHaveBeenCalled();
        expect(unmuteMyself).not.toHaveBeenCalled();
        expect(leaveCallConfirmation).not.toHaveBeenCalled();
    });

    it('should show the callee and Calling instead of a duration while ringing', () => {
        const {getByTestId, queryByText} = renderWithIntlAndTheme(<CurrentCallBar {...getCallingProps()}/>);

        expect(getByTestId('calls.calling_text')).toHaveTextContent('Calling...');
        expect(getByTestId('call-avatar').props.userId).toBe(callee.id);
        expect(queryByText('No one is talking')).toBeNull();
        expect(queryByText('01:05')).toBeNull();
    });

    it('should hide the channel name while in a DM call', () => {
        // The callee's name is already the headline, so repeating it as the channel name is noise.
        const {queryByText} = renderWithIntlAndTheme(<CurrentCallBar {...getCallingProps()}/>);
        expect(queryByText(/Test Channel/)).toBeNull();

        const {getByText} = renderWithIntlAndTheme(<CurrentCallBar {...{...getCallingProps(), isDMCall: false}}/>);
        expect(getByText(/Test Channel/)).toBeVisible();
    });

    it('should switch to the answered duration once the callee joins', () => {
        const props = {
            ...getCallingProps(),
            isDMCalling: false,
            dmCalleeAnsweredAt: now - 5000,
        };
        const {getByText, queryByTestId} = renderWithIntlAndTheme(<CurrentCallBar {...props}/>);

        // Counts from the answer, not from the call's startTime 65s ago.
        expect(getByText('00:05')).toBeVisible();
        expect(queryByTestId('calls.calling_text')).toBeNull();
    });

    it('should show the speaker and the channel name for a regular call', () => {
        const baseProps = getBaseProps();
        const props = {
            ...baseProps,
            currentCall: {...DefaultCurrentCall, ...baseProps.currentCall, voiceOn: {'speaker-session': true}},
            sessionsDict: {'speaker-session': speakerSession},
        };
        const {getByTestId, getByText} = renderWithIntlAndTheme(<CurrentCallBar {...props}/>);

        expect(getByText(/speaker\s+is talking\.\.\./)).toBeVisible();
        expect(getByTestId('call-avatar').props.userId).toBe(speaker.id);
        expect(getByText(/Test Channel/)).toBeVisible();
    });

    it('should not crash when the speaker has no session yet', () => {
        // voiceOn can arrive before the speaker's session does.
        const baseProps = getBaseProps();
        const props = {
            ...baseProps,
            currentCall: {...DefaultCurrentCall, ...baseProps.currentCall, voiceOn: {'unknown-session': true}},
            sessionsDict: {},
        };
        const {getByText} = renderWithIntlAndTheme(<CurrentCallBar {...props}/>);

        expect(getByText(/Someone\s+is talking\.\.\./)).toBeVisible();
    });
});
