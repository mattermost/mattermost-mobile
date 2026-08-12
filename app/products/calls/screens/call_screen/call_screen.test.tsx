// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {DefaultCurrentCall, type CallSession, type CurrentCall} from '@calls/types/calls';
import {Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import CallScreen from './call_screen';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn(),
    navigateBack: jest.fn(),
    navigateToScreen: jest.fn(),
}));

const mySession: CallSession = {
    sessionId: 'session1',
    userId: 'user1',
    muted: true,
    raisedHand: 0,
};

const currentCall: CurrentCall = {
    ...DefaultCurrentCall,
    id: 'call1',
    channelId: 'channel1',
    serverUrl: 'server1',
    myUserId: 'user1',
    mySessionId: mySession.sessionId,
    sessions: {[mySession.sessionId]: mySession},
};

const getBaseProps = (): ComponentProps<typeof CallScreen> => ({
    currentCall,
    sessionsDict: {[mySession.sessionId]: mySession},
    micPermissionsGranted: true,
    teammateNameDisplay: 'username',
    displayName: 'channel-display-name',
    isOwnDirectMessage: false,
    isDM: false,
    otherParticipants: false,
    isAdmin: false,
    isHost: false,
});

describe('CallScreen', () => {
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
