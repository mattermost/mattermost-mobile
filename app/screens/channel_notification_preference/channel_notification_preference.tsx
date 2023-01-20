// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {NotificationLevel} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';
import SettingBlock from '@screens/settings/setting_block';
import SettingContainer from '@screens/settings/setting_container';
import SettingOption from '@screens/settings/setting_option';
import SettingSeparator from '@screens/settings/settings_separator';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type NotifPrefOptions = {
    defaultMessage: string;
    id: string;
    testID: string;
    value: string;
}

const NOTIFY_OPTIONS_THREAD: Record<string, NotifPrefOptions> = {
    THREAD_REPLIES: {
        defaultMessage: 'Notify me about replies to threads I’m following in this channel',
        id: t('channel_notification_preference.notification.thread_replies'),
        testID: 'channel_notification_preference.notification.thread_replies',
        value: 'thread_replies',
    },
};
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
};
const NOTIFY_ABOUT = {id: t('channel_notification_preference.notify_about'), defaultMessage: 'Notify me about...'};
const THREAD_REPLIES = {id: t('channel_notification_preference.thread_replies'), defaultMessage: 'Thread replies'};

const MUTED_TITLE = {id: t('channel_notification_preference.muted_title'), defaultMessage: 'This channel is muted'};
const MUTED_CONTENT = {id: t('channel_notification_preference.muted_content'), defaultMessage: 'You can change the notification settings, but you will not receive notifications until the channel is unmuted.'};

const UNMUTE_CONTENT = {id: t('channel_notification_preference.unmute_content'), defaultMessage: 'Unmute channel'};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        mutedBanner: {
            width: '90%',
            minHeight: 200,
            backgroundColor: changeOpacity(theme.sidebarTextActiveBorder, 0.16),
            alignSelf: 'center',
            marginVertical: 20,
            paddingHorizontal: 16,
            borderRadius: 4,
        },
        mutedBannerTitle: {
            flexDirection: 'row',
            marginTop: 16,
        },
        mutedTextTitle: {
            ...typography('Heading', 200),
            color: theme.centerChannelColor,
            marginLeft: 10,
            paddingTop: 5,
        },
        mutedText: {
            ...typography('Body', 200),
            color: theme.centerChannelColor,
            marginTop: 12,
            marginBottom: 16,
        },
        unMuteButton: {
            flexDirection: 'row',
            backgroundColor: theme.buttonBg,
            marginBottom: 20,
            borderRadius: 4,
            paddingVertical: 12,
            width: '55%',
            paddingHorizontal: 20,
        },
        unMuteText: {
            ...typography('Heading', 100),
            color: theme.buttonColor,
            marginLeft: 7,
        },
    };
});

type ChannelNotificationPreferenceProps = {
    componentId: string;
    notifyLevel?: NotificationLevel;

    isCRTEnabled: boolean;

};
const ChannelNotificationPreference = ({componentId, notifyLevel, isCRTEnabled}: ChannelNotificationPreferenceProps) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

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

    const renderMutedBanner = useCallback(() => {
        return (
            <View style={styles.mutedBanner}>
                <View style={styles.mutedBannerTitle}>
                    <CompassIcon
                        name='bell-off-outline'
                        size={24}
                        color={theme.linkColor}
                    />
                    <Text style={styles.mutedTextTitle}>{intl.formatMessage(MUTED_TITLE)}</Text>
                </View>
                <Text style={styles.mutedText}>{intl.formatMessage(MUTED_CONTENT)}</Text>
                <TouchableOpacity style={styles.unMuteButton}>
                    <CompassIcon
                        name='bell-outline'
                        size={18}
                        color={theme.buttonColor}
                    />
                    <Text style={styles.unMuteText}>{intl.formatMessage(UNMUTE_CONTENT)}</Text>
                </TouchableOpacity>
            </View>
        );
    }, []);

    useBackNavigation(saveNotificationSettings);

    useAndroidHardwareBackHandler(componentId, saveNotificationSettings);

    return (
        <SettingContainer testID='push_notification_settings'>
            {renderMutedBanner()}
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
                            <SettingSeparator key={`notif_pref_option_separator${k}`}/>
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
                            id: NOTIFY_OPTIONS_THREAD.THREAD_REPLIES.id,
                            defaultMessage: NOTIFY_OPTIONS_THREAD.THREAD_REPLIES.defaultMessage,
                        })}
                        testID={NOTIFY_OPTIONS_THREAD.THREAD_REPLIES.testID}
                        type='toggle'
                        value={`${threadReplies}`}
                    />
                    <SettingSeparator/>
                </SettingBlock>)}
        </SettingContainer>
    );
};

export default ChannelNotificationPreference;
