// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import Preferences from 'mattermost-redux/constants/preferences';

import {shallowWithIntl} from 'test/intl-test-helper';

import CustomList from 'app/components/custom_list';
import ChannelMembers from './channel_members';

describe('ChannelMembers', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
        currentUserId: 'current-user-id',
        currentChannelId: 'current-channel-id',
        canManageUsers: false,
        actions: {
            getProfilesInChannel: jest.fn().mockImplementation(() => Promise.resolve()),
            handleRemoveChannelMembers: jest.fn(),
            searchProfiles: jest.fn(),
            setButtons: jest.fn(),
            popTopScreen: jest.fn(),
        },
        componentId: 'component-id',
        isLandscape: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <ChannelMembers {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should use renderUnselectableItem when canManagerUsers is false', () => {
        const props = {...baseProps, canManageUsers: false};

        const wrapper = shallowWithIntl(
            <ChannelMembers {...props}/>,
        );

        const renderItem = wrapper.find(CustomList).props().renderItem;
        expect(renderItem).toEqual(wrapper.instance().renderUnselectableItem);
    });

    test('should use renderSelectableItem when canManagerUsers is true', () => {
        const props = {...baseProps, canManageUsers: true};

        const wrapper = shallowWithIntl(
            <ChannelMembers {...props}/>,
        );

        const renderItem = wrapper.find(CustomList).props().renderItem;
        expect(renderItem).toEqual(wrapper.instance().renderSelectableItem);
    });
});