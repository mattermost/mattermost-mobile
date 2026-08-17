// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {leaveCallConfirmation} from '@calls/actions/calls';
import {leaveAndJoinWithAlert} from '@calls/alerts';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {CallsCustomMessage} from './calls_custom_message';

jest.mock('@calls/actions/calls', () => ({
    leaveCallConfirmation: jest.fn(),
}));

jest.mock('@calls/alerts', () => ({
    leaveAndJoinWithAlert: jest.fn(),
    showLimitRestrictedAlert: jest.fn(),
}));

jest.mock('@calls/state', () => ({
    setJoiningChannelId: jest.fn(),
}));

const CALLER_ID = 'caller-id';
const CALLEE_ID = 'callee-id';
const CHANNEL_ID = 'channel-id';

describe('CallsCustomMessage', () => {
    function getBaseProps(): ComponentProps<typeof CallsCustomMessage> {
        return {
            post: TestHelper.fakePostModel({
                channelId: CHANNEL_ID,
                userId: CALLER_ID,
                props: {start_at: 1000, call_status: 'calling'},
            }),
            currentUser: TestHelper.fakeUserModel({id: CALLER_ID, username: 'leonard'}),
            caller: TestHelper.fakeUserModel({id: CALLER_ID, username: 'leonard'}),
            teammateNameDisplay: 'username',
            isMilitaryTime: false,
            joiningChannelId: null,
            otherParticipants: false,
            isAdmin: false,
            isHost: true,
            ccChannelId: CHANNEL_ID,
            numSessions: 1,
        };
    }

    function asCallee(props: ComponentProps<typeof CallsCustomMessage>) {
        return {
            ...props,
            currentUser: TestHelper.fakeUserModel({id: CALLEE_ID, username: 'arjun'}),
            ccChannelId: undefined,
        };
    }

    it('should show the caller that the call is ringing, with a cancel button', () => {
        const props = getBaseProps();
        const {getByText, getByTestId} = renderWithIntlAndTheme(<CallsCustomMessage {...props}/>);

        getByText('Calling...');
        getByText('Cancel');

        fireEvent.press(getByTestId('calls_custom_message.hangup_button'));
        expect(leaveCallConfirmation).toHaveBeenCalled();
    });

    it('should show the callee an incoming call, with a join button', () => {
        const props = asCallee(getBaseProps());
        const {getByText, getByTestId} = renderWithIntlAndTheme(<CallsCustomMessage {...props}/>);

        getByText('Incoming call...');
        getByText('Join');

        fireEvent.press(getByTestId('calls_custom_message.join_button'));
        expect(leaveAndJoinWithAlert).toHaveBeenCalled();
    });

    it('should show a started call once the callee answers, even though call_status is still calling', () => {
        const props = getBaseProps();
        props.numSessions = 2;
        const {getByText} = renderWithIntlAndTheme(<CallsCustomMessage {...props}/>);

        getByText('Call started');
        getByText('Leave');
    });

    it('should show a bare ended call once the call is torn down, before the post has an end_at', () => {
        const props = getBaseProps();
        props.numSessions = 2;
        props.callTornDown = true;
        const {getByText, queryByTestId} = renderWithIntlAndTheme(<CallsCustomMessage {...props}/>);

        getByText('Call ended');

        // Without an end_at there are no timings to show, and the call can no longer be joined or left.
        expect(queryByTestId('calls_custom_message.sub_heading')).toBeNull();
        expect(queryByTestId('calls_custom_message.join_button')).toBeNull();
        expect(queryByTestId('calls_custom_message.hangup_button')).toBeNull();
    });

    it('should show no answer to the caller and a missed call to the callee', () => {
        const props = getBaseProps();
        props.post = TestHelper.fakePostModel({
            channelId: CHANNEL_ID,
            userId: CALLER_ID,
            props: {start_at: 1000, end_at: 31000, call_status: 'no_answer'},
        });

        const caller = renderWithIntlAndTheme(<CallsCustomMessage {...props}/>);
        caller.getByText('Call ended');
        caller.getByText('No answer');

        const callee = renderWithIntlAndTheme(<CallsCustomMessage {...asCallee(props)}/>);
        callee.getByText('Missed call');
    });

    it('should name the caller when telling the callee the call was canceled', () => {
        const props = getBaseProps();
        props.post = TestHelper.fakePostModel({
            channelId: CHANNEL_ID,
            userId: CALLER_ID,
            props: {start_at: 1000, end_at: 4000, call_status: 'canceled_by_caller'},
        });

        const caller = renderWithIntlAndTheme(<CallsCustomMessage {...props}/>);
        caller.getByText('You canceled the call');

        const callee = renderWithIntlAndTheme(<CallsCustomMessage {...asCallee(props)}/>);
        callee.getByText('Canceled by leonard');
    });

    it('should show the duration for a call that was answered and then ended, with no buttons', () => {
        const props = getBaseProps();
        props.post = TestHelper.fakePostModel({
            channelId: CHANNEL_ID,
            userId: CALLER_ID,
            props: {start_at: 1000, end_at: 121000, call_status: 'ended'},
        });

        const {getByText, queryByTestId} = renderWithIntlAndTheme(<CallsCustomMessage {...props}/>);

        getByText('Call ended');
        getByText('Ended at');
        getByText('Lasted 2 minutes');
        expect(queryByTestId('calls_custom_message.join_button')).toBeNull();
        expect(queryByTestId('calls_custom_message.hangup_button')).toBeNull();
    });
});
