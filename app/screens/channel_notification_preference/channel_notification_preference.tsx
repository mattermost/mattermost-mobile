// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';

import {NotificationLevel} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';
import SettingBlock from '@screens/settings/setting_block';
import SettingContainer from '@screens/settings/setting_container';
import SettingOption from '@screens/settings/setting_option';
import SettingSeparator from '@screens/settings/settings_separator';

type NotifPrefOptions = {
    defaultMessage: string;
    id: string;
    testID: string;
    value: string;
}

const NOTIFY_OPTIONS: Record<string, NotifPrefOptions> = {
    ALL: {
        defaultMessage: 'All new messages',
        id: t('channel_notification_preference.notification.all'),
        testID: 'channel_notification_preference.notification.all',
        value: NotificationLevel.ALL,
    },
    MENTION: {
        defaultMessage: 'Mentions, direct messages only(default)',
        id: t('channel_notification_preference.notification.mention'),
        testID: 'channel_notification_preference.notification.mention',
        value: NotificationLevel.MENTION,
    },
    NONE: {
        defaultMessage: 'Nothing',
        id: t('channel_notification_preference.notification.none'),
        testID: 'channel_notification_preference.notification.none',
        value: NotificationLevel.NONE,
    },
    THREAD_REPLIES: {
        defaultMessage: 'Notify me about replies to threads I’m following in this channel',
        id: t('channel_notification_preference.notification.thread_replies'),
        testID: 'channel_notification_preference.notification.thread_replies',
        value: 'thread_replies',
    },
};
const NOTIFY_ABOUT = {id: t('channel_notification_preference.notify_about'), defaultMessage: 'Notify me about...'};
const THREAD_REPLIES = {id: t('channel_notification_preference.thread_replies'), defaultMessage: 'Thread replies'};

type ChannelNotificationPreferenceProps = {
    componentId: string;
    notifyLevel?: NotificationLevel;

    isCRTEnabled: boolean;

};
const ChannelNotificationPreference = ({componentId, notifyLevel, isCRTEnabled}: ChannelNotificationPreferenceProps) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const [notifyAbout, setNotifyAbout] = useState<UserNotifyPropsPush>(notifyLevel);
    const [threadReplies, setThreadReplies] = useState<boolean>(false); // TODO: get from server
    const close = () => popTopScreen(componentId);

    const canSaveSettings = useCallback(() => notifyAbout !== notifyLevel, [notifyAbout, notifyLevel]);

    const saveNotificationSettings = useCallback(() => {
        const canSave = canSaveSettings();
        if (canSave) {
            // const notify_props: UserNotifyProps = {};
            // updateMe(serverUrl, {notify_props});
        }
        close();
    }, [canSaveSettings, close, serverUrl]);

    useBackNavigation(saveNotificationSettings);

    useAndroidHardwareBackHandler(componentId, saveNotificationSettings);

    return (
        <SettingContainer testID='push_notification_settings'>
            <SettingBlock
                headerText={NOTIFY_ABOUT}
            >
                { Object.keys(NOTIFY_OPTIONS).map((k: string) => {
                    const {id, defaultMessage, value, testID} = NOTIFY_OPTIONS[k];
                    return (
                        <>
                            <SettingOption
                                action={setNotifyAbout}
                                key={`notif_pref_option${k}`}
                                label={intl.formatMessage({id, defaultMessage})}
                                selected={notifyAbout === k}
                                testID={testID}
                                type='select'
                                value={value}
                            />
                            <SettingSeparator/>
                        </>
                    );
                })
                }
            </SettingBlock>
            {isCRTEnabled && (
                <SettingBlock
                    headerText={THREAD_REPLIES}
                >
                    <SettingOption
                        action={setThreadReplies}
                        key='notif_pref_option_thread_replies'
                        label={intl.formatMessage({
                            id: NOTIFY_OPTIONS.THREAD_REPLIES.id,
                            defaultMessage: NOTIFY_OPTIONS.THREAD_REPLIES.defaultMessage,
                        })}
                        testID={NOTIFY_OPTIONS.THREAD_REPLIES.testID}
                        type='toggle'
                        value={`${threadReplies}`}
                    />
                    <SettingSeparator/>
                </SettingBlock>)}
        </SettingContainer>
    );
};

export default ChannelNotificationPreference;
