// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {savePreference} from '@actions/remote/preference';
import {updateMe} from '@actions/remote/user';
import Block from '@components/block';
import OptionItem from '@components/option_item';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {popTopScreen, setButtons} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getEmailInterval, getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const edges: Edge[] = ['left', 'right'];

//todo: if all the background will be of same color - perhaps create a re-usable component to act as container

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        },
        scrollViewContent: {
            paddingVertical: 35,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
        },
        upperCase: {
            textTransform: 'uppercase',
        },
        containerStyle: {
            paddingHorizontal: 20,
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

const SAVE_EMAIL_BUTTON_ID = 'settings_notification.email.save.button';

type NotificationEmailProps = {
    componentId: string;
    currentUser: UserModel;
    emailInterval: string;
    enableEmailBatching: boolean;
    isCRTEnabled: boolean;
    sendEmailNotifications: boolean;
}

const NotificationEmail = ({
    componentId,
    currentUser,
    emailInterval,
    enableEmailBatching,
    isCRTEnabled,
    sendEmailNotifications,
}: NotificationEmailProps) => {
    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);

    const initialInterval = useMemo(() => getEmailInterval(sendEmailNotifications, enableEmailBatching, parseInt(emailInterval, 10)).toString(), [sendEmailNotifications, enableEmailBatching, emailInterval]);
    const initialEmailThreads = useMemo(() => Boolean(notifyProps?.email_threads === 'all'), []);

    const [notifyInterval, setNotifyInterval] = useState<string>(initialInterval);
    const [emailThreads, setEmailThreads] = useState(initialEmailThreads);

    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const setEmailInterval = (interval: string) => {
        setNotifyInterval(interval);
    };

    const handleEmailThreadsChanged = (thread: boolean) => {
        setEmailThreads(thread);
    };

    const saveButton = useMemo(() => {
        return {
            id: SAVE_EMAIL_BUTTON_ID,
            enabled: false,
            showAsAction: 'always' as const,
            testID: 'settings_display.save.button',
            color: theme.sidebarHeaderTextColor,
            text: intl.formatMessage({id: 'settings.display.militaryClock.save', defaultMessage: 'Save'}),
        };
    }, [theme.sidebarHeaderTextColor]);

    const close = () => popTopScreen(componentId);

    const saveEmail = useCallback(async () => {
        const promises = [];
        const updatePromise = updateMe(serverUrl, {
            notify_props: {
                ...notifyProps,
                email: `${sendEmailNotifications && notifyInterval !== Preferences.INTERVAL_NEVER.toString()}`,
                email_threads: emailThreads ? 'all' : 'mention',
            },
        });
        promises.push(updatePromise);

        if (notifyInterval !== initialInterval) {
            const emailIntervalPreference = {
                category: Preferences.CATEGORY_NOTIFICATIONS,
                name: Preferences.EMAIL_INTERVAL,
                user_id: currentUser.id,
                value: notifyInterval,
            };
            const savePrefPromise = savePreference(serverUrl, [emailIntervalPreference]);
            promises.push(savePrefPromise);
        }
        await Promise.all(promises);
        close();
    }, [notifyProps, notifyInterval, emailThreads, serverUrl, currentUser.id, sendEmailNotifications]);

    useEffect(() => {
        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled: notifyInterval !== initialInterval || emailThreads !== initialEmailThreads,
            }],
        };
        setButtons(componentId, buttons);
    }, [componentId, saveButton, notifyInterval, emailThreads]);

    useAndroidHardwareBackHandler(componentId, close);
    useNavButtonPressed(SAVE_EMAIL_BUTTON_ID, componentId, saveEmail, [saveEmail]);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
            testID='notification_mention.screen'
        >
            <ScrollView
                alwaysBounceVertical={false}
                contentContainerStyle={styles.scrollViewContent}
                style={styles.scrollView}
            >
                <Block
                    disableFooter={!sendEmailNotifications}
                    footerText={emailFooterText}
                    headerStyles={styles.upperCase}
                    headerText={emailHeaderText}
                >
                    {sendEmailNotifications &&
                        <>
                            <OptionItem
                                action={setEmailInterval}
                                containerStyle={styles.containerStyle}
                                label={intl.formatMessage({id: 'notification_settings.email.immediately', defaultMessage: 'Immediately'})}
                                selected={notifyInterval === `${Preferences.INTERVAL_IMMEDIATE}`}
                                testID='notification_settings.email.immediately.action'
                                type='select'
                                value={`${Preferences.INTERVAL_IMMEDIATE}`}
                            />
                            <View style={styles.separator}/>
                            {enableEmailBatching &&
                                <View>
                                    <OptionItem
                                        action={setEmailInterval}
                                        containerStyle={styles.containerStyle}
                                        label={intl.formatMessage({id: 'notification_settings.email.fifteenMinutes', defaultMessage: 'Every 15 minutes'})}
                                        selected={notifyInterval === `${Preferences.INTERVAL_FIFTEEN_MINUTES}`}
                                        type='select'
                                        value={`${Preferences.INTERVAL_FIFTEEN_MINUTES}`}
                                    />
                                    <View style={styles.separator}/>
                                    <OptionItem
                                        action={setEmailInterval}
                                        containerStyle={styles.containerStyle}
                                        label={intl.formatMessage({id: 'notification_settings.email.everyHour', defaultMessage: 'Every hour'})}
                                        selected={notifyInterval === `${Preferences.INTERVAL_HOUR}`}
                                        type='select'
                                        value={`${Preferences.INTERVAL_HOUR}`}
                                    />
                                    <View style={styles.separator}/>
                                </View>
                            }
                            <OptionItem
                                action={setEmailInterval}
                                containerStyle={styles.containerStyle}
                                label={intl.formatMessage({id: 'notification_settings.email.never', defaultMessage: 'Never'})}
                                selected={notifyInterval === `${Preferences.INTERVAL_NEVER}`}
                                testID='notification_settings.email.never.action'
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
                </Block>
                {isCRTEnabled && notifyProps.email === 'true' && (
                    <Block
                        footerText={emailFooterCRTText}
                        headerStyles={styles.upperCase}
                        headerText={emailHeaderCRTText}
                    >
                        <OptionItem
                            action={handleEmailThreadsChanged}
                            containerStyle={styles.containerStyle}
                            label={intl.formatMessage({id: 'user.settings.notifications.email_threads.description', defaultMessage: 'Notify me about all replies to threads I\'m following'})}
                            selected={emailThreads}
                            type='toggle'
                        />
                        <View style={styles.separator}/>
                    </Block>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationEmail;
