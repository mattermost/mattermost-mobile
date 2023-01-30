// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {LayoutChangeEvent, Text, TouchableOpacity, View} from 'react-native';

import {toggleMuteChannel, updateChannelNotifyProps} from '@actions/remote/channel';
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

import type {AvailableScreens} from '@typings/screens/navigation';

type NotifPrefOptions = {
    defaultMessage: string;
    id: string;
    testID: string;
    value: string;
}

const BLOCK_TITLE_HEIGHT = 13;

const NOTIFY_OPTIONS_THREAD: Record<string, NotifPrefOptions> = {
    THREAD_REPLIES: {
        defaultMessage: 'Notify me about replies to threads I’m following in this channel',
        id: t('channel_notification_preference.notification.thread_replies'),
        testID: 'channel_notification_preference.notification.thread_replies',
        value: 'thread_replies',
    },
};

const NOTIFY_OPTIONS: Record<string, NotifPrefOptions> = {
    [NotificationLevel.ALL]: {
        defaultMessage: 'All new messages',
        id: t('channel_notification_preference.notification.all'),
        testID: 'channel_notification_preference.notification.all',
        value: NotificationLevel.ALL,
    },
    [NotificationLevel.MENTION]: {
        defaultMessage: 'Mentions, direct messages only',
        id: t('channel_notification_preference.notification.mention'),
        testID: 'channel_notification_preference.notification.mention',
        value: NotificationLevel.MENTION,
    },
    [NotificationLevel.NONE]: {
        defaultMessage: 'Nothing',
        id: t('channel_notification_preference.notification.none'),
        testID: 'channel_notification_preference.notification.none',
        value: NotificationLevel.NONE,
    },
};

const NOTIFY_ABOUT = {id: t('channel_notification_preference.notify_about'), defaultMessage: 'Notify me about...'};
const THREAD_REPLIES = {id: t('channel_notification_preference.thread_replies'), defaultMessage: 'Thread replies'};
const RESET_DEFAULT = {id: t('channel_notification_preference.reset_default'), defaultMessage: 'Reset to default'};
const UNMUTE_CONTENT = {id: t('channel_notification_preference.unmute_content'), defaultMessage: 'Unmute channel'};
const MUTED_TITLE = {id: t('channel_notification_preference.muted_title'), defaultMessage: 'This channel is muted'};
const MUTED_CONTENT = {id: t('channel_notification_preference.muted_content'), defaultMessage: 'You can change the notification settings, but you will not receive notifications until the channel is unmuted.'};

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
        resetIcon: {
            color: theme.linkColor,
            height: 18,
            width: 18,
        },
        resetText: {
            color: theme.linkColor,
            marginLeft: 7,
            ...typography('Heading', 100),
        },
        resetContainer: {
            position: 'absolute',
            flexDirection: 'row',
            right: 20,
            zIndex: 1,
        },
    };
});

type NotifyPrefType = typeof NotificationLevel[keyof typeof NotificationLevel];
type ChannelNotifyPropsPushThread = ChannelNotifyProps['push_threads'];
type ChannelNotifyPropsPush = ChannelNotifyProps['push'];
type ChannelNotificationPreferenceProps = {
    channelId: string;
    componentId: AvailableScreens;
    isCRTEnabled: boolean;
    isChannelMuted: boolean;
    notifyLevel: ChannelNotifyPropsPush;
    notifyThreadReplies: ChannelNotifyPropsPushThread;
};
const ChannelNotificationPreference = ({
    channelId,
    componentId,
    isCRTEnabled,
    isChannelMuted,
    notifyLevel,
    notifyThreadReplies,
}: ChannelNotificationPreferenceProps) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [top, setTop] = useState(0);

    const globalDefault = notifyLevel === 'default' ? 'all' : notifyLevel;
    const [notifyAbout, setNotifyAbout] = useState<UserNotifyPropsPush>(notifyLevel);
    const [threadReplies, setThreadReplies] = useState<boolean>(notifyThreadReplies === 'all');

    const [resetDefaultVisible, setResetDefaultVisible] = useState<boolean>(false);

    const onSetNotifyAbout = useCallback((notifyValue: NotifyPrefType) => {
        setNotifyAbout(notifyValue);
        setResetDefaultVisible(notifyValue !== globalDefault);
    }, [globalDefault]);

    const onSetThreadReplies = useCallback(() => {
        setThreadReplies((prev) => !prev);
    }, []);

    const close = () => popTopScreen(componentId);

    const saveChannelNotificationPref = useCallback(() => {
        if (resetDefaultVisible) {
            const props: Partial<ChannelNotifyProps> = {
                push: notifyAbout,
                push_threads: threadReplies ? 'all' : 'mention',
            };
            updateChannelNotifyProps(serverUrl, channelId, props);
        }
        close();
    }, [channelId, close, notifyAbout, resetDefaultVisible, serverUrl, threadReplies]);

    const renderMutedBanner = useCallback(() => {
        const onPress = async () => {
            return toggleMuteChannel(serverUrl, channelId, false);
        };
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
                <TouchableOpacity
                    style={styles.unMuteButton}
                    onPress={onPress}
                >
                    <CompassIcon
                        name='bell-outline'
                        size={18}
                        color={theme.buttonColor}
                    />
                    <Text style={styles.unMuteText}>{intl.formatMessage(UNMUTE_CONTENT)}</Text>
                </TouchableOpacity>
            </View>
        );
    }, [intl, styles, serverUrl, channelId]);

    const renderResetDefault = useCallback(() => {
        const onPress = () => {
            setNotifyAbout(globalDefault);
            setResetDefaultVisible(false);
        };
        return (
            <TouchableOpacity
                style={[styles.resetContainer, {top}]}
                onPress={onPress}
            >
                <CompassIcon
                    name='refresh'
                    style={styles.resetIcon}
                    size={20}
                />
                <Text style={styles.resetText}>
                    {intl.formatMessage(RESET_DEFAULT)}
                </Text>
            </TouchableOpacity>
        );
    }, [top, globalDefault]);

    const renderThreadReplies = useCallback(() => {
        const isHidden = [NotificationLevel.NONE, NotificationLevel.ALL].includes(notifyAbout);
        if (isHidden) {
            return null;
        }

        return (
            <SettingBlock
                headerText={THREAD_REPLIES}
            >
                <SettingOption
                    action={onSetThreadReplies}
                    label={intl.formatMessage({id: NOTIFY_OPTIONS_THREAD.THREAD_REPLIES.id, defaultMessage: NOTIFY_OPTIONS_THREAD.THREAD_REPLIES.defaultMessage})}
                    testID={NOTIFY_OPTIONS_THREAD.THREAD_REPLIES.testID}
                    type='toggle'
                    selected={threadReplies}
                />
                <SettingSeparator/>
            </SettingBlock>
        );
    }, [notifyAbout, threadReplies, intl, onSetThreadReplies]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const {y} = e.nativeEvent.layout;
        setTop(y + BLOCK_TITLE_HEIGHT);
    }, []);

    useBackNavigation(saveChannelNotificationPref);

    useAndroidHardwareBackHandler(componentId, saveChannelNotificationPref);

    return (
        <SettingContainer testID='push_notification_settings'>
            {isChannelMuted && renderMutedBanner()}
            {resetDefaultVisible && renderResetDefault()}
            <SettingBlock
                headerText={NOTIFY_ABOUT}
                onLayout={onLayout}
            >
                { Object.keys(NOTIFY_OPTIONS).map((k: string) => {
                    const {id, defaultMessage, value, testID} = NOTIFY_OPTIONS[k];
                    const defaultOption = k === globalDefault ? ' (default)' : '';
                    const label = `${intl.formatMessage({id, defaultMessage})}${defaultOption}`;
                    return (
                        <View key={`notif_pref_option${k}`}>
                            <SettingOption
                                action={onSetNotifyAbout}
                                label={label}
                                selected={notifyAbout === k}
                                testID={testID}
                                type='select'
                                value={value}
                            />
                            <SettingSeparator/>
                        </View>
                    );
                })
                }
            </SettingBlock>
            {isCRTEnabled && renderThreadReplies()}
        </SettingContainer>
    );
};

export default ChannelNotificationPreference;
