// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {General} from '@mm-redux/constants';

import ChannelTitle from './channel_title';

jest.mock('react-intl');

describe('ChannelTitle', () => {
    const baseProps = {
        displayName: 'My Channel',
        isGuest: false,
        hasGuests: false,
        canHaveSubtitle: false,
        isSelfDMChannel: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ChannelTitle {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when isSelfDMChannel is true', () => {
        const props = {
            ...baseProps,
            displayName: 'My User',
            isSelfDMChannel: true,
        };
        const wrapper = shallow(
            <ChannelTitle {...props}/>,
            {context: {intl: {formatMessage: (intlId) => intlId.defaultMessage}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when is DM and has guests but the teammate is not the guest (when can show subtitles)', () => {
        const props = {
            ...baseProps,
            displayName: 'Other user',
            channelType: General.DM_CHANNEL,
            isGuest: false,
            hasGuests: true,
            canHaveSubtitle: true,
        };
        const wrapper = shallow(
            <ChannelTitle {...props}/>,
            {context: {intl: {formatMessage: (intlId) => intlId.defaultMessage}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when is DM and has guests and the teammate is the guest (when can show subtitles)', () => {
        const props = {
            ...baseProps,
            displayName: 'Other user',
            channelType: General.DM_CHANNEL,
            isGuest: true,
            hasGuests: true,
            canHaveSubtitle: true,
        };
        const wrapper = shallow(
            <ChannelTitle {...props}/>,
            {context: {intl: {formatMessage: (intlId) => intlId.defaultMessage}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with custom status emoji', () => {
        const wrapper = shallow(
            <ChannelTitle
                {...baseProps}
                channelType={General.DM_CHANNEL}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
