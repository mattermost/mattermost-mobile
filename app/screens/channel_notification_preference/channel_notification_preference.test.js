// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ViewTypes} from '@constants';
import Preferences from '@mm-redux/constants/preferences';
import SectionItem from '@screens/settings/section_item';
import {shallowWithIntlMessages} from '@test/intl-test-helper';

import ChannelNotificationPreference from './channel_notification_preference';

function makeProps(pushNotificationLevel, pushThreadsNotificationLevel, isCollapsedThreadsEnabled = false) {
    return {
        actions: {
            updateChannelNotifyProps: jest.fn(),
        },
        channelId: 'channel_id',
        globalNotifyProps: {
            push: 'mention',
        },
        userId: 'user_id',
        notifyProps: {
            push: pushNotificationLevel,
            push_threads: pushThreadsNotificationLevel,
        },
        theme: Preferences.THEMES.denim,
        isCollapsedThreadsEnabled,
    };
}

function checkNotificationSelected(pushNotificationLevel, trueIdx) {
    const wrapper = shallowWithIntlMessages(
        <ChannelNotificationPreference
            {...makeProps(pushNotificationLevel)}
        />,
    );

    const sectionItems = wrapper.find(SectionItem);

    expect(sectionItems.exists()).toBe(true);
    expect(sectionItems.length).toBe(4);

    sectionItems.forEach((sectionItem, idx) => {
        expect(sectionItem.prop('selected')).toBe(idx === trueIdx);
    });
}

describe('ChannelNotificationPreference', () => {
    test('should match snapshot', () => {
        const baseProps = makeProps('default');
        const wrapper = shallowWithIntlMessages(
            <ChannelNotificationPreference {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should have correct setting selected', () => {
        checkNotificationSelected(null, 0);
        checkNotificationSelected(ViewTypes.NotificationLevels.DEFAULT, 0);
        checkNotificationSelected(ViewTypes.NotificationLevels.ALL, 1);
        checkNotificationSelected(ViewTypes.NotificationLevels.MENTION, 2);
        checkNotificationSelected(ViewTypes.NotificationLevels.NONE, 3);
    });

    test('should save on click, when CRT off', () => {
        const props = makeProps('default');
        const wrapper = shallowWithIntlMessages(
            <ChannelNotificationPreference {...props}/>,
        );

        // click on 'Never' -- last item
        wrapper.find(SectionItem).at(3).dive().simulate('press');

        expect(props.actions.updateChannelNotifyProps).toHaveBeenCalledTimes(1);
        expect(props.actions.updateChannelNotifyProps).toBeCalledWith(
            props.userId,
            props.channelId,
            {push: ViewTypes.NotificationLevels.NONE},
        );
    });

    test('should save on click, when CRT on', () => {
        const props = makeProps('default', undefined, true);
        const wrapper = shallowWithIntlMessages(
            <ChannelNotificationPreference {...props}/>,
        );

        // click on 'Never' -- last item
        wrapper.find(SectionItem).at(3).dive().simulate('press');

        expect(props.actions.updateChannelNotifyProps).toHaveBeenCalledTimes(1);
        expect(props.actions.updateChannelNotifyProps).toBeCalledWith(
            props.userId,
            props.channelId,
            {
                push: ViewTypes.NotificationLevels.NONE,
                push_threads: ViewTypes.NotificationLevels.ALL,
            },
        );
    });

    test('should show push_threads switch, when CRT is on and notifyLevel is mention', () => {
        const props = makeProps('all', undefined, true);
        const wrapper = shallowWithIntlMessages(
            <ChannelNotificationPreference {...props}/>,
        );

        expect(wrapper.find(SectionItem)).toHaveLength(4);

        wrapper.setState({
            notificationLevel: 'mention',
        });

        expect(wrapper.find(SectionItem)).toHaveLength(5);
    });

    test('should show push_threads switch, when CRT is off and notifyLevel is mention', () => {
        const props = makeProps('mention', undefined, false);
        const wrapper = shallowWithIntlMessages(
            <ChannelNotificationPreference {...props}/>,
        );
        expect(wrapper.find(SectionItem)).toHaveLength(4);
    });
});
