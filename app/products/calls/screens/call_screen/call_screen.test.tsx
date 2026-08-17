// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {DefaultCurrentCall, type CallSession} from '@calls/types/calls';
import {Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CallScreen from './call_screen';

jest.mock('@calls/actions', () => ({
    muteMyself: jest.fn(),
    unmuteMyself: jest.fn(),
}));

jest.mock('@calls/actions/calls', () => ({
    leaveCallConfirmation: jest.fn(),
    startCallRecording: jest.fn(),
    stopCallRecording: jest.fn(),
    switchToCallThread: jest.fn(),
}));

jest.mock('@calls/alerts', () => ({
    recordingAlert: jest.fn(),
    recordingWillBePostedAlert: jest.fn(),
    recordingErrorAlert: jest.fn(),
    stopRecordingConfirmationAlert: jest.fn(),
}));

jest.mock('@calls/state', () => ({
    setCallQualityAlertDismissed: jest.fn(),
    setMicPermissionsErrorDismissed: jest.fn(),
    useCallsConfig: () => ({EnableRecordings: false, EnableTranscriptions: false}),
    useIncomingCalls: () => ({incomingCalls: []}),
}));

jest.mock('@calls/hooks', () => ({
    ...jest.requireActual('@calls/hooks'),
    usePermissionsChecker: jest.fn(),
    useHostMenus: () => ({
        hostControlsAvailable: false,
        onPress: jest.fn(),
        openProfile: jest.fn(),
    }),
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://test.server.com',
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn(),
    navigateBack: jest.fn(),
    navigateToScreen: jest.fn(),
}));

// The participant cards pull avatars over the network; the calling-state assertions only care about
// which cards are on screen and what they're labelled.
jest.mock('@calls/components/call_avatar', () => 'CallAvatar');
jest.mock('@calls/screens/call_screen/participant_card', () => ({
    ParticipantCard: () => null,
}));

describe('CallScreen', () => {
    const now = new Date('2026-01-01T12:00:00Z').getTime();
    const callee = TestHelper.fakeUserModel({id: 'callee-id', username: 'callee'});

    const mySession: CallSession = {
        sessionId: 'my-session',
        userId: 'my-id',
        muted: false,
        raisedHand: 0,
        userModel: TestHelper.fakeUserModel({id: 'my-id', username: 'me'}),
    };

    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function getBaseProps(): ComponentProps<typeof CallScreen> {
        return {
            currentCall: {
                ...DefaultCurrentCall,
                connected: true,
                serverUrl: 'https://test.server.com',
                myUserId: 'my-id',
                mySessionId: 'my-session',
                channelId: 'channel-id',
                startTime: now - 65000,
                sessions: {'my-session': mySession},
            },
            sessionsDict: {'my-session': mySession},
            micPermissionsGranted: true,
            teammateNameDisplay: 'username',
            displayName: 'callee',
            isOwnDirectMessage: false,
            isDM: false,
            otherParticipants: false,
            isAdmin: false,
            isHost: true,
            isDMCalling: false,
            dmCallee: undefined,
            dmCalleeAnsweredAt: now - 5000,
        };
    }

    function getCallingProps(): ComponentProps<typeof CallScreen> {
        return {
            ...getBaseProps(),
            isDM: true,
            isDMCalling: true,
            dmCallee: callee,
            dmCalleeAnsweredAt: 0,
        };
    }

    it('should show a loading card for the callee while ringing', () => {
        const {getByTestId} = renderWithIntlAndTheme(<CallScreen {...getCallingProps()}/>);

        expect(getByTestId('calls.calling_participant')).toHaveTextContent('callee');
    });

    it('should show Calling in the header instead of a duration while ringing', () => {
        const {getByTestId, queryByText} = renderWithIntlAndTheme(<CallScreen {...getCallingProps()}/>);

        expect(getByTestId('calls.calling_text')).toHaveTextContent('Calling...');
        expect(queryByText('01:05')).toBeNull();
    });

    it('should drop the loading card and count from the answer once the callee joins', () => {
        const props = getBaseProps();
        props.isDM = true;

        const {getByText, queryByTestId} = renderWithIntlAndTheme(<CallScreen {...props}/>);

        expect(queryByTestId('calls.calling_participant')).toBeNull();
        expect(queryByTestId('calls.calling_text')).toBeNull();

        // Counts from the answer 5s ago, not from the call's startTime 65s ago.
        expect(getByText('00:05')).toBeVisible();
    });

    it('should not show the People button in a DM call, where the only other participant is already on screen', () => {
        const props = getBaseProps();
        props.isDM = true;

        const {queryByText} = renderWithIntlAndTheme(<CallScreen {...props}/>);

        expect(queryByText('People')).toBeNull();
    });

    it('should show the People button and open the participants list when the call is not a DM', () => {
        const props = getBaseProps();
        props.isDM = false;

        const {getByText} = renderWithIntlAndTheme(<CallScreen {...props}/>);

        fireEvent.press(getByText('People'));

        expect(navigateToScreen).toHaveBeenCalledWith(Screens.CALL_PARTICIPANTS);
    });
});
