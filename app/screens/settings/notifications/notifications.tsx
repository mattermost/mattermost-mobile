// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Platform, ScrollView, Text} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {General, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {goToScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getEmailInterval, getEmailIntervalTexts, getNotificationProps} from '@utils/user';

import SettingItem from '../setting_item';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        contentContainerStyle: {
            marginTop: 20,
        },
        rightLabel: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 100, 'Regular'),
            alignSelf: 'center',
            ...Platform.select({
                android: {
                    marginRight: 20,
                },
            }),
        },
    };
});

const edges: Edge[] = ['left', 'right'];

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
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);

    const emailIntervalPref = useMemo(() => getEmailInterval(
        sendEmailNotifications && notifyProps?.email === 'true',
        enableEmailBatching,
        parseInt(emailInterval, 10),
    ).toString(), []);

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
        <SafeAreaView
            edges={edges}
            testID='notification_settings.screen'
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.contentContainerStyle}
                alwaysBounceVertical={false}
            >
                <SettingItem
                    defaultMessage={isCRTEnabled ? mentionTexts.crtOn.defaultMessage : mentionTexts.crtOff.defaultMessage}
                    i18nId={isCRTEnabled ? mentionTexts.crtOn.id : mentionTexts.crtOff.id}
                    onPress={goToNotificationSettingsMentions}
                    optionName='mentions'
                />
                <SettingItem
                    optionName='push_notification'
                    onPress={goToNotificationSettingsPush}
                />
                <SettingItem
                    optionName='email'
                    onPress={goToEmailSettings}
                    rightComponent={(
                        <Text
                            style={styles.rightLabel}
                        >
                            {intl.formatMessage(getEmailIntervalTexts(emailIntervalPref))}
                        </Text>
                    )}
                />
                {enableAutoResponder && (
                    <SettingItem
                        onPress={goToNotificationAutoResponder}
                        optionName='automatic_dm_replies'
                        rightComponent={(
                            <Text
                                style={styles.rightLabel}
                            >
                                {currentUser.status === General.OUT_OF_OFFICE && notifyProps.auto_responder_active ? 'On' : 'Off'}
                            </Text>
                        )}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default Notifications;
