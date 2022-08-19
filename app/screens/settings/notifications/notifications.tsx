// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import {General, Screens} from '@constants';
import {t} from '@i18n';
import {goToScreen} from '@screens/navigation';
import {getEmailInterval, getEmailIntervalTexts, getNotificationProps} from '@utils/user';

import SettingContainer from '../setting_container';
import SettingItem from '../setting_item';

import type UserModel from '@typings/database/models/servers/user';

const mentionTexts = {
    crtOn: {
        id: t('notification_settings.mentions'),
        defaultMessage: 'Mentions',
    },
    crtOff: {
        id: t('notification_settings.mentions_replies'),
        defaultMessage: 'Mentions and Replies',
    },
};

type NotificationsProps = {
    currentUser: UserModel;
    emailInterval: string;
    enableAutoResponder: boolean;
    enableEmailBatching: boolean;
    isCRTEnabled: boolean;
    sendEmailNotifications: boolean;
}
const Notifications = ({
    currentUser,
    emailInterval,
    enableAutoResponder,
    enableEmailBatching,
    isCRTEnabled,
    sendEmailNotifications,
}: NotificationsProps) => {
    const intl = useIntl();
    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);

    const emailIntervalPref = useMemo(() =>
        getEmailInterval(
            sendEmailNotifications && notifyProps?.email === 'true',
            enableEmailBatching,
            parseInt(emailInterval, 10),
        ).toString(),
    [emailInterval, enableEmailBatching, notifyProps, sendEmailNotifications]);

    const goToNotificationSettingsMentions = useCallback(() => {
        const screen = Screens.SETTINGS_NOTIFICATION_MENTION;

        const id = isCRTEnabled ? t('notification_settings.mentions') : t('notification_settings.mentions_replies');
        const defaultMessage = isCRTEnabled ? 'Mentions' : 'Mentions and Replies';
        const title = intl.formatMessage({id, defaultMessage});

        goToScreen(screen, title);
    }, [isCRTEnabled]);

    const goToNotificationSettingsPush = useCallback(() => {
        const screen = Screens.SETTINGS_NOTIFICATION_PUSH;
        const title = intl.formatMessage({
            id: 'notification_settings.push_notification',
            defaultMessage: 'Push Notifications',
        });

        goToScreen(screen, title);
    }, []);

    const goToNotificationAutoResponder = useCallback(() => {
        const screen = Screens.SETTINGS_NOTIFICATION_AUTO_RESPONDER;
        const title = intl.formatMessage({
            id: 'notification_settings.auto_responder',
            defaultMessage: 'Automatic Replies',
        });
        goToScreen(screen, title);
    }, []);

    const goToEmailSettings = useCallback(() => {
        const screen = Screens.SETTINGS_NOTIFICATION_EMAIL;
        const title = intl.formatMessage({id: 'notification_settings.email', defaultMessage: 'Email Notifications'});
        goToScreen(screen, title);
    }, []);

    return (
        <SettingContainer>
            <SettingItem
                onPress={goToNotificationSettingsMentions}
                optionName='mentions'
                label={intl.formatMessage({
                    id: isCRTEnabled ? mentionTexts.crtOn.id : mentionTexts.crtOff.id,
                    defaultMessage: isCRTEnabled ? mentionTexts.crtOn.defaultMessage : mentionTexts.crtOff.defaultMessage,
                })}
            />
            <SettingItem
                optionName='push_notification'
                onPress={goToNotificationSettingsPush}
            />
            <SettingItem
                optionName='email'
                onPress={goToEmailSettings}
                info={intl.formatMessage(getEmailIntervalTexts(emailIntervalPref))}
            />
            {enableAutoResponder && (
                <SettingItem
                    onPress={goToNotificationAutoResponder}
                    optionName='automatic_dm_replies'
                    info={currentUser.status === General.OUT_OF_OFFICE && notifyProps.auto_responder_active === 'true' ? 'On' : 'Off'}
                />
            )}
        </SettingContainer>
    );
};

export default Notifications;
