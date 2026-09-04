// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {muteMyself, unmuteMyself} from '@calls/actions';
import {leaveCallConfirmation} from '@calls/actions/calls';
import CallAvatar from '@calls/components/call_avatar';
import {useCurrentCall} from '@calls/state';
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
    useCurrentCall: jest.fn(),
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

// The avatar pulls the picture over the network. Mocked so the tests can assert whose avatar a card
// shows and which mic state it was given, without rendering an image.
jest.mock('@calls/components/call_avatar');
jest.mocked(CallAvatar).mockImplementation((props) => React.createElement('CallAvatar', {
    ...props,
    testID: `call-avatar-${props.userModel?.id ?? 'unknown'}`,
}));

describe('CallScreen', () => {
    const now = new Date('2026-01-01T12:00:00Z').getTime();
    const callee = TestHelper.fakeUserModel({id: 'callee-id', username: 'callee'});

    const mySession: CallSession = {
        sessionId: 'my-session',
        userId: 'my-id',
        muted: false,
        raisedHand: 0,
        video: false,
        userModel: TestHelper.fakeUserModel({id: 'my-id', username: 'me'}),
    };

    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // ParticipantCard reads the call from the store rather than from props.
    const renderScreen = (props: ComponentProps<typeof CallScreen>) => {
        jest.mocked(useCurrentCall).mockReturnValue(props.currentCall);
        return renderWithIntlAndTheme(<CallScreen {...props}/>);
    };

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
                hostId: 'my-id',
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
            isDMConnecting: false,
            isDMCalling: false,
            currentUser: mySession.userModel,
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

    // Placing the call: we're on the call screen before either of us has a session in the call.
    function getConnectingProps(): ComponentProps<typeof CallScreen> {
        return {
            ...getCallingProps(),
            currentCall: {
                ...getBaseProps().currentCall!,
                connected: false,
                startedByMe: true,
                startUnmuted: true,
                mySessionId: '',
                sessions: {},
                startTime: 0,
            },
            sessionsDict: {},
            isDMConnecting: true,
            isDMCalling: false,
            isHost: true,
            dmCalleeAnsweredAt: 0,
        };
    }

    it('should show both participants and Connecting in the header while the call is being placed', () => {
        const {getByTestId, getByText, queryByText} = renderScreen(getConnectingProps());

        expect(getByText(/me \(you\)/)).toBeVisible();
        expect(getByTestId('calls.calling_participant')).toHaveTextContent('callee');
        expect(getByTestId('calls.connecting_text')).toHaveTextContent('Connecting...');
        expect(queryByText('00:00')).toBeNull();
    });

    it('should show our own card the same way while placing the call and once our session lands', () => {
        // Everything about the card has to match across the two phases, or it visibly changes
        // under the user: the avatar remounts, the mic badge flips, the host badge shifts it.
        const placing = renderScreen(getConnectingProps());

        expect(placing.getByTestId('call-avatar-my-id').props.muted).toBe(false);
        expect(placing.getByText(/me \(you\)/)).toBeVisible();
        expect(placing.getByText('host')).toBeVisible();
        placing.unmount();

        const inTheCall = renderScreen(getCallingProps());

        expect(inTheCall.getByTestId('call-avatar-my-id').props.muted).toBe(false);
        expect(inTheCall.getByText(/me \(you\)/)).toBeVisible();
        expect(inTheCall.getByText('host')).toBeVisible();
    });

    it('should keep our card on screen while the rendered sessions trail the call by a database tick', () => {
        // sessionsDict comes from a database query, so it lands after currentCall.sessions. Our card
        // has to come from the same place it is rendered from, or it drops out for that tick. Here
        // our session has just been added to the call and the server has yet to confirm our unmute.
        const props = getCallingProps();
        props.currentCall = {...props.currentCall!, startUnmuted: true};
        props.sessionsDict = {};

        const {getByTestId, getAllByTestId, getByText} = renderScreen(props);

        expect(getAllByTestId('call-avatar-my-id')).toHaveLength(1);
        expect(getByText(/me \(you\)/)).toBeVisible();
        expect(getByTestId('call-avatar-my-id').props.muted).toBe(false);
    });

    it('should keep our card on screen when the media connection is up before our session arrives', () => {
        // connected comes from the calls socket, the session from the main one; the gap between
        // them used to blank the whole call view.
        const props = getConnectingProps();
        props.currentCall = {...props.currentCall!, connected: true, mySessionId: 'my-session'};

        const {getByTestId, getByText} = renderScreen(props);

        expect(getByTestId('call-avatar-my-id')).toBeVisible();
        expect(getByText(/me \(you\)/)).toBeVisible();
        expect(getByTestId('calls.connecting_text')).toBeVisible();
    });

    it('should not act on the call controls while the call is being placed, since there is no connection yet', () => {
        const {getByTestId} = renderScreen(getConnectingProps());

        fireEvent.press(getByTestId('mute-unmute'));
        fireEvent.press(getByTestId('leave'));

        expect(muteMyself).not.toHaveBeenCalled();
        expect(unmuteMyself).not.toHaveBeenCalled();
        expect(leaveCallConfirmation).not.toHaveBeenCalled();
    });

    it('should show a loading card for the callee while ringing', () => {
        const {getByTestId} = renderScreen(getCallingProps());

        expect(getByTestId('calls.calling_participant')).toHaveTextContent('callee');
    });

    it('should show Calling in the header instead of a duration while ringing', () => {
        const {getByTestId, queryByText} = renderScreen(getCallingProps());

        expect(getByTestId('calls.calling_text')).toHaveTextContent('Calling...');
        expect(queryByText('01:05')).toBeNull();
    });

    it('should drop the loading card and count from the answer once the callee joins', () => {
        const props = getBaseProps();
        props.isDM = true;

        const {getByText, queryByTestId} = renderScreen(props);

        expect(queryByTestId('calls.calling_participant')).toBeNull();
        expect(queryByTestId('calls.calling_text')).toBeNull();

        // Counts from the answer 5s ago, not from the call's startTime 65s ago.
        expect(getByText('00:05')).toBeVisible();
    });

    it('should not show the People button in a DM call, where the only other participant is already on screen', () => {
        const props = getBaseProps();
        props.isDM = true;

        const {queryByText} = renderScreen(props);

        expect(queryByText('People')).toBeNull();
    });

    it('should show the People button and open the participants list when the call is not a DM', () => {
        const props = getBaseProps();
        props.isDM = false;

        const {getByText} = renderScreen(props);

        fireEvent.press(getByText('People'));

        expect(navigateToScreen).toHaveBeenCalledWith(Screens.CALL_PARTICIPANTS);
    });
});
