// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {leaveCall} from '@calls/actions';
import {startPhoneCall} from '@calls/alerts';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {PhoneCallCustomMessage} from './phone_call_custom_message';

jest.mock('@calls/actions', () => ({
    leaveCall: jest.fn(),
}));

jest.mock('@calls/alerts', () => ({
    startPhoneCall: jest.fn(),
}));

const CALLER_ID = 'caller-id';
const TARGET_ID = 'target-id';

describe('PhoneCallCustomMessage', () => {
    function getBaseProps(callProps: Record<string, unknown> = {}): ComponentProps<typeof PhoneCallCustomMessage> {
        return {
            post: TestHelper.fakePostModel({
                channelId: 'bot-dm',
                userId: CALLER_ID,
                props: {
                    call_type: 'phone',
                    phone_number: '+15551234567',
                    display_label: 'Mobile',
                    target_user_id: TARGET_ID,
                    start_at: 1000,
                    end_at: 0,
                    call_status: 'calling',
                    ...callProps,
                },
            }),
            currentUser: TestHelper.fakeUserModel({id: CALLER_ID, username: 'me'}),
            targetUser: undefined,
            teammateNameDisplay: 'username',
            canDial: true,
            inCall: false,
            answered: false,
        };
    }

    it('should show the caller an unanswered call with its number and label, and call the same target again', () => {
        const props = getBaseProps({end_at: 5000, call_status: 'no_answer'});
        const {getByText, getByTestId} = renderWithIntlAndTheme(<PhoneCallCustomMessage {...props}/>);

        getByText('No answer');
        getByText('+15551234567 • Mobile');

        fireEvent.press(getByTestId('phone_call_custom_message.call_again_button'));
        expect(startPhoneCall).toHaveBeenCalledWith(expect.anything(), expect.any(String), {
            number: '+15551234567',
            targetUserId: TARGET_ID,
            displayLabel: 'Mobile',
        });
    });

    it('should omit the target user and label when calling again a raw phone number', () => {
        const props = getBaseProps({end_at: 5000, call_status: 'no_answer', target_user_id: undefined, display_label: undefined});
        const {getByTestId} = renderWithIntlAndTheme(<PhoneCallCustomMessage {...props}/>);

        fireEvent.press(getByTestId('phone_call_custom_message.call_again_button'));
        expect(startPhoneCall).toHaveBeenCalledWith(expect.anything(), expect.any(String), {
            number: '+15551234567',
            targetUserId: undefined,
            displayLabel: undefined,
        });
    });

    it('should show the called user a missed call they cannot call back', () => {
        const props = {
            ...getBaseProps({end_at: 5000, call_status: 'no_answer'}),
            currentUser: TestHelper.fakeUserModel({id: TARGET_ID, username: 'leonard'}),
        };
        const {getByText, queryByText} = renderWithIntlAndTheme(<PhoneCallCustomMessage {...props}/>);

        getByText('Missed call');
        expect(queryByText('Call again')).toBeNull();
    });

    it('should name the called user while ringing and hang up from the card', () => {
        const props = {
            ...getBaseProps(),
            targetUser: TestHelper.fakeUserModel({id: TARGET_ID, username: 'Leonard'}),
            inCall: true,
        };
        const {getByText, getByTestId} = renderWithIntlAndTheme(<PhoneCallCustomMessage {...props}/>);

        getByText('Calling Leonard…');

        fireEvent.press(getByTestId('phone_call_custom_message.hangup_button'));
        expect(leaveCall).toHaveBeenCalled();
    });
});
