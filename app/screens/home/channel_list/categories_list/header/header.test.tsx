// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import {renderWithIntl} from '@test/intl-test-helper';

import Header from './header';

describe('components/channel_list/header', () => {
    it('Channel List Header Component should match snapshot', () => {
        const {toJSON} = renderWithIntl(
            <Header
                pushProxyStatus={PUSH_PROXY_STATUS_VERIFIED}
                canCreateChannels={true}
                canJoinChannels={true}
                canInvitePeople={true}
                displayName={'Test!'}
                pushDisabledAck={true}
            />,
        );

        expect(toJSON()).toMatchSnapshot();
    });

    it('Push notifications disabled and not having ackoledge show alert icon', () => {
        const wrapper = renderWithIntl(
            <Header
                pushProxyStatus={PUSH_PROXY_RESPONSE_NOT_AVAILABLE}
                canCreateChannels={true}
                canJoinChannels={true}
                canInvitePeople={true}
                displayName={'Test!'}
                pushDisabledAck={false}
            />,
        );

        expect(wrapper.getByTestId('channel_list_header.push_alert')).toBeTruthy();
    });

    it('Push notifications disabled but after ackoledging do not show alert icon', () => {
        const wrapper = renderWithIntl(
            <Header
                pushProxyStatus={PUSH_PROXY_RESPONSE_NOT_AVAILABLE}
                canCreateChannels={true}
                canJoinChannels={true}
                canInvitePeople={true}
                displayName={'Test!'}
                pushDisabledAck={true}
            />,
        );

        expect(wrapper.queryByTestId('channel_list_header.push_alert')).toBeNull();
    });
});
