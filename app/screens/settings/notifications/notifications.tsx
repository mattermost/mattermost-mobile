// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Notifications as RNNotifications} from 'react-native-notifications';

import {getCallsConfig} from '@calls/state';
import SettingContainer from '@components/settings/container';
import SettingItem from '@components/settings/item';
import {General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useAppState} from '@hooks/device';
import useNotificationProps from '@hooks/notification_props';
import {navigateBack, navigateToSettingsScreen} from '@screens/navigation';
import {logError} from '@utils/log';
import {getEmailInterval, getEmailIntervalTexts} from '@utils/user';

import NotificationsDisabledNotice from './notifications_disabled_notice';
import SendTestNotificationNotice from './send_test_notification_notice';

import type UserModel from '@typings/database/models/servers/user';

const mentionTexts = defineMessages({
    crtOn: {
        id: 'notification_settings.mentions',
        defaultMessage: 'Mentions',
    },
    crtOff: {
        id: 'notification_settings.mentions_replies',
        defaultMessage: 'Mentions and Replies',
    },
    callsOn: {
        id: 'notification_settings.calls_on',
        defaultMessage: 'On',
    },
    callsOff: {
        id: 'notification_settings.calls_off',
        defaultMessage: 'Off',
    },
});

export type NotificationsProps = {
    currentUser?: UserModel;
    emailInterval: string;
    enableAutoResponder: boolean;
    enableEmailBatching: boolean;
    isCRTEnabled: boolean;
    sendEmailNotifications: boolean;
    serverVersion: string;
}
const Notifications = ({
    currentUser,
    emailInterval,
    enableAutoResponder,
    enableEmailBatching,
    isCRTEnabled,
    sendEmailNotifications,
    serverVersion,
}: NotificationsProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const notifyProps = useNotificationProps(currentUser);
    const callsRingingEnabled = useMemo(() => getCallsConfig(serverUrl).EnableRinging, [serverUrl]);
    const [isRegistered, setIsRegistered] = useState(true);

    const appState = useAppState();

    useEffect(() => {
        let isCurrent = true;
        if (appState === 'active') {
            const checkNotificationStatus = async () => {
                try {
                    const registered = await RNNotifications.isRegisteredForRemoteNotifications();
                    if (isCurrent) {
                        setIsRegistered(registered);
                    }
                } catch (error) {
                    if (isCurrent) {
                        logError('Error checking notification registration status:', error);
                    }
                }
            };
            checkNotificationStatus();
        }
        return () => {
            isCurrent = false;
        };
    }, [appState]);

    const emailIntervalPref = useMemo(() =>
        getEmailInterval(
            sendEmailNotifications && notifyProps?.email === 'true',
            enableEmailBatching,
            parseInt(emailInterval, 10),
        ).toString(),
    [emailInterval, enableEmailBatching, notifyProps, sendEmailNotifications]);

    const callsNotificationsOn = useMemo(() => Boolean(notifyProps?.calls_mobile_sound ? notifyProps.calls_mobile_sound === 'true' : notifyProps?.calls_desktop_sound === 'true'),
        [notifyProps]);

    const goToNotificationSettingsMentions = useCallback(() => {
        const message = isCRTEnabled ? mentionTexts.crtOn : mentionTexts.crtOff;
        const title = intl.formatMessage(message);
        navigateToSettingsScreen(Screens.SETTINGS_NOTIFICATION_MENTION, {title});
    }, [intl, isCRTEnabled]);

    const goToNotificationSettingsPush = useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_NOTIFICATION_PUSH);
    }, []);

    const goToNotificationSettingsCall = useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_NOTIFICATION_CALL);
    }, []);

    const goToNotificationAutoResponder = useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_NOTIFICATION_AUTO_RESPONDER);
    }, []);

    const goToEmailSettings = useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_NOTIFICATION_EMAIL);
    }, []);

    useAndroidHardwareBackHandler(Screens.SETTINGS_NOTIFICATION, navigateBack);

    return (
        <SettingContainer testID='notification_settings'>
            {!isRegistered &&
                <NotificationsDisabledNotice
                    testID='notifications-disabled-notice'
                />}
            <SettingItem
                onPress={goToNotificationSettingsMentions}
                optionName='mentions'
                label={intl.formatMessage(isCRTEnabled ? mentionTexts.callsOn : mentionTexts.callsOff)}
                testID='notification_settings.mentions.option'
            />
            <SettingItem
                optionName='push_notification'
                onPress={goToNotificationSettingsPush}
                testID='notification_settings.push_notifications.option'
            />
            {callsRingingEnabled &&
                <SettingItem
                    optionName='call_notification'
                    onPress={goToNotificationSettingsCall}
                    info={intl.formatMessage(callsNotificationsOn ? mentionTexts.callsOn : mentionTexts.callsOff)}
                    testID='notification_settings.call_notifications.option'
                />
            }
            <SettingItem
                optionName='email'
                onPress={goToEmailSettings}
                info={intl.formatMessage(getEmailIntervalTexts(emailIntervalPref))}
                testID='notification_settings.email_notifications.option'
            />
            {enableAutoResponder && (
                <SettingItem
                    onPress={goToNotificationAutoResponder}
                    optionName='automatic_dm_replies'
                    info={currentUser?.status === General.OUT_OF_OFFICE && notifyProps.auto_responder_active === 'true' ? 'On' : 'Off'}
                    testID='notification_settings.automatic_replies.option'
                />
            )}
            <SendTestNotificationNotice
                serverVersion={serverVersion}
                userId={currentUser?.id || ''}
            />
        </SettingContainer>
    );
};

export default Notifications;
