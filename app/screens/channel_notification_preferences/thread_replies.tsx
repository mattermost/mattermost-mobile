// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import SettingBlock from '@components/settings/block';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {NotificationLevel} from '@constants';
import {t} from '@i18n';

type Props = {
    isSelected: boolean;
    notifyLevel: NotificationLevel;
    onPress: (selected: boolean) => void;
}

type NotifPrefOptions = {
    defaultMessage: string;
    id: string;
    testID: string;
    value: string;
}

const THREAD_REPLIES = {id: t('channel_notification_preferences.thread_replies'), defaultMessage: 'Thread replies'};
const NOTIFY_OPTIONS_THREAD: Record<string, NotifPrefOptions> = {
    THREAD_REPLIES: {
        defaultMessage: 'Notify me about replies to threads I’m following in this channel',
        id: t('channel_notification_preferences.notification.thread_replies'),
        testID: 'channel_notification_preferences.notification.thread_replies',
        value: 'thread_replies',
    },
};

const NotifyAbout = ({isSelected, notifyLevel, onPress}: Props) => {
    const {formatMessage} = useIntl();

    const hiddenStates: NotificationLevel[] = [NotificationLevel.NONE, NotificationLevel.ALL];
    if (hiddenStates.includes(notifyLevel)) {
        return null;
    }

    return (
        <SettingBlock headerText={THREAD_REPLIES}>
            <SettingOption
                action={onPress}
                label={formatMessage({id: NOTIFY_OPTIONS_THREAD.THREAD_REPLIES.id, defaultMessage: NOTIFY_OPTIONS_THREAD.THREAD_REPLIES.defaultMessage})}
                testID={NOTIFY_OPTIONS_THREAD.THREAD_REPLIES.testID}
                type='toggle'
                selected={isSelected}
            />
            <SettingSeparator/>
        </SettingBlock>
    );
};

export default NotifyAbout;
