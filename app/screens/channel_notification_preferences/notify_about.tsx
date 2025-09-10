// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {type LayoutChangeEvent, View} from 'react-native';

import SettingBlock from '@components/settings/block';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {NotificationLevel} from '@constants';

import type {SharedValue} from 'react-native-reanimated';

type Props = {
    isMuted: boolean;
    defaultLevel: NotificationLevel;
    notifyLevel: NotificationLevel;
    notifyTitleTop: SharedValue<number>;
    onPress: (level: NotificationLevel) => void;
}

type NotifPrefOptions = {
    defaultMessage: string;
    id: string;
    testID: string;
    value: string;
}

export const BLOCK_TITLE_HEIGHT = 13;

const messages = defineMessages({
    notifyAbout: {
        id: 'channel_notification_preferences.notify_about',
        defaultMessage: 'Notify me about...',
    },
    [NotificationLevel.ALL]: {
        id: 'channel_notification_preferences.notification.all',
        defaultMessage: 'All new messages',
    },
    [NotificationLevel.MENTION]: {
        id: 'channel_notification_preferences.notification.mention',
        defaultMessage: 'Mentions only',
    },
    [NotificationLevel.NONE]: {
        id: 'channel_notification_preferences.notification.none',
        defaultMessage: 'Nothing',
    },
});

const NOTIFY_ABOUT = messages.notifyAbout;

const NOTIFY_OPTIONS: Record<string, NotifPrefOptions> = {
    [NotificationLevel.ALL]: {
        ...messages[NotificationLevel.ALL],
        testID: 'channel_notification_preferences.notification.all',
        value: NotificationLevel.ALL,
    },
    [NotificationLevel.MENTION]: {
        ...messages[NotificationLevel.MENTION],
        testID: 'channel_notification_preferences.notification.mention',
        value: NotificationLevel.MENTION,
    },
    [NotificationLevel.NONE]: {
        ...messages[NotificationLevel.NONE],
        testID: 'channel_notification_preferences.notification.none',
        value: NotificationLevel.NONE,
    },
};

const NotifyAbout = ({
    defaultLevel,
    isMuted,
    notifyLevel,
    notifyTitleTop,
    onPress,
}: Props) => {
    const {formatMessage} = useIntl();
    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const {y} = e.nativeEvent.layout;

        notifyTitleTop.value = y > 0 ? y + 10 : BLOCK_TITLE_HEIGHT;

        // NotifyTitleTop is a shared value, so its reference should not change between renders.
        // we add it to the dependencies to satisfy the linter.
    }, [notifyTitleTop]);

    let notifyLevelToUse = notifyLevel;
    if (notifyLevel === NotificationLevel.DEFAULT) {
        notifyLevelToUse = defaultLevel;
    }

    return (
        <SettingBlock
            headerText={NOTIFY_ABOUT}
            headerStyles={{marginTop: isMuted ? 8 : 12}}
            onLayout={onLayout}
        >
            {Object.keys(NOTIFY_OPTIONS).map((key) => {
                const {id, defaultMessage, value, testID} = NOTIFY_OPTIONS[key];
                const defaultOption = key === defaultLevel ? formatMessage({id: 'channel_notification_preferences.default', defaultMessage: '(default)'}) : '';
                const label = `${formatMessage({id, defaultMessage})} ${defaultOption}`;

                return (
                    <View key={`notif_pref_option${key}`}>
                        <SettingOption
                            action={onPress}
                            label={label}
                            selected={notifyLevelToUse === key}
                            testID={testID}
                            type='select'
                            value={value}
                        />
                        <SettingSeparator/>
                    </View>
                );
            })}
        </SettingBlock>
    );
};

export default NotifyAbout;
