// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import {savePreference} from '@actions/remote/preference';
import {updateMe} from '@actions/remote/user';
import SettingBlock from '@components/settings/block';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getEmailInterval, getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        disabled: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
            marginHorizontal: 20,
        },
    };
});

const emailHeaderText = {
    id: t('notification_settings.email.send'),
    defaultMessage: 'Send email notifications',
};
const emailFooterText = {
    id: t('notification_settings.email.emailInfo'),
    defaultMessage: 'Email notifications are sent for mentions and direct messages when you are offline or away for more than 5 minutes.',
};

const emailHeaderCRTText = {
    id: t('notification_settings.email.crt.send'),
    defaultMessage: 'Thread reply notifications',
};
const emailFooterCRTText = {
    id: t('notification_settings.email.crt.emailInfo'),
    defaultMessage: "When enabled, any reply to a thread you're following will send an email notification",
};

type NotificationEmailProps = {
    componentId: AvailableScreens;
    currentUser?: UserModel;
    emailInterval: string;
    enableEmailBatching: boolean;
    isCRTEnabled: boolean;
    sendEmailNotifications: boolean;
}

const NotificationEmail = ({componentId, currentUser, emailInterval, enableEmailBatching, isCRTEnabled, sendEmailNotifications}: NotificationEmailProps) => {
    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser?.notifyProps]);
    const initialInterval = useMemo(
        () => getEmailInterval(sendEmailNotifications && notifyProps?.email === 'true', enableEmailBatching, parseInt(emailInterval, 10)).toString(),
        [/* dependency array should remain empty */],
    );
    const initialEmailThreads = useMemo(() => Boolean(notifyProps?.email_threads === 'all'), [/* dependency array should remain empty */]);

    const [notifyInterval, setNotifyInterval] = useState<string>(initialInterval);
    const [emailThreads, setEmailThreads] = useState(initialEmailThreads);

    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const close = () => popTopScreen(componentId);

    const saveEmail = useCallback(() => {
        if (!currentUser) {
            return;
        }

        const canSaveSetting = notifyInterval !== initialInterval || emailThreads !== initialEmailThreads;
        if (canSaveSetting) {
            const promises = [];
            const updatePromise = updateMe(serverUrl, {
                notify_props: {
                    ...notifyProps,
                    email: `${sendEmailNotifications && notifyInterval !== Preferences.INTERVAL_NEVER.toString()}`,
                    ...(isCRTEnabled && {email_threads: emailThreads ? 'all' : 'mention'}),
                },
            });
            promises.push(updatePromise);

            if (notifyInterval !== initialInterval) {
                const emailIntervalPreference = {
                    category: Preferences.CATEGORIES.NOTIFICATIONS,
                    name: Preferences.EMAIL_INTERVAL,
                    user_id: currentUser.id,
                    value: notifyInterval,
                };
                const savePrefPromise = savePreference(serverUrl, [emailIntervalPreference]);
                promises.push(savePrefPromise);
            }
            Promise.all(promises);
        }
        close();
    }, [notifyProps, notifyInterval, emailThreads, serverUrl, currentUser?.id, sendEmailNotifications]);

    useAndroidHardwareBackHandler(componentId, saveEmail);

    useBackNavigation(saveEmail);

    return (
        <SettingContainer testID='email_notification_settings'>
            <SettingBlock
                disableFooter={!sendEmailNotifications}
                footerText={emailFooterText}
                headerText={emailHeaderText}
            >
                {sendEmailNotifications &&
                <>
                    <SettingOption
                        action={setNotifyInterval}
                        label={intl.formatMessage({id: 'notification_settings.email.immediately', defaultMessage: 'Immediately'})}
                        selected={notifyInterval === `${Preferences.INTERVAL_IMMEDIATE}`}
                        testID='email_notification_settings.immediately.option'
                        type='select'
                        value={`${Preferences.INTERVAL_IMMEDIATE}`}
                    />
                    <SettingSeparator/>
                    {enableEmailBatching &&
                    <>
                        <SettingOption
                            action={setNotifyInterval}
                            label={intl.formatMessage({id: 'notification_settings.email.fifteenMinutes', defaultMessage: 'Every 15 minutes'})}
                            selected={notifyInterval === `${Preferences.INTERVAL_FIFTEEN_MINUTES}`}
                            testID='email_notification_settings.every_fifteen_minutes.option'
                            type='select'
                            value={`${Preferences.INTERVAL_FIFTEEN_MINUTES}`}
                        />
                        <SettingSeparator/>
                        <SettingOption
                            action={setNotifyInterval}
                            label={intl.formatMessage({id: 'notification_settings.email.everyHour', defaultMessage: 'Every hour'})}
                            selected={notifyInterval === `${Preferences.INTERVAL_HOUR}`}
                            testID='email_notification_settings.every_hour.option'
                            type='select'
                            value={`${Preferences.INTERVAL_HOUR}`}
                        />
                        <SettingSeparator/>
                    </>
                    }
                    <SettingOption
                        action={setNotifyInterval}
                        label={intl.formatMessage({id: 'notification_settings.email.never', defaultMessage: 'Never'})}
                        selected={notifyInterval === `${Preferences.INTERVAL_NEVER}`}
                        testID='email_notification_settings.never.option'
                        type='select'
                        value={`${Preferences.INTERVAL_NEVER}`}
                    />
                </>
                }
                {!sendEmailNotifications &&
                <Text
                    style={styles.disabled}
                >
                    {intl.formatMessage({
                        id: 'notification_settings.email.emailHelp2',
                        defaultMessage: 'Email has been disabled by your System Administrator. No notification emails will be sent until it is enabled.',
                    })}
                </Text>
                }
            </SettingBlock>
            {isCRTEnabled && notifyInterval !== Preferences.INTERVAL_NEVER.toString() && (
                <SettingBlock
                    footerText={emailFooterCRTText}
                    headerText={emailHeaderCRTText}
                >
                    <SettingOption
                        action={setEmailThreads}
                        label={intl.formatMessage({id: 'user.settings.notifications.email_threads.description', defaultMessage: 'Notify me about all replies to threads I\'m following'})}
                        selected={emailThreads}
                        testID='email_notification_settings.email_threads.option'
                        type='toggle'
                    />
                    <SettingSeparator/>
                </SettingBlock>
            )}
        </SettingContainer>
    );
};

export default NotificationEmail;
