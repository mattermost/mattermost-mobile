// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import Block from '@components/block';
import OptionItem from '@components/option_item';
import {Preferences} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getNotificationProps} from '@utils/user';

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

type EmailInterval = typeof Preferences.INTERVAL_FIFTEEN_MINUTES | typeof Preferences.INTERVAL_IMMEDIATE | typeof Preferences.INTERVAL_HOUR | typeof Preferences.INTERVAL_NEVER;
type EmailThreads = 'mention' | 'all';

type NotificationEmailProps = {
    currentUser: UserModel;
    emailInterval: EmailInterval;
    enableEmailBatching: boolean;
    isCRTEnabled: boolean;
    sendEmailNotifications: boolean;
}

//fixme: need to add a save button like the others
const NotificationEmail = ({
    currentUser,
    emailInterval,
    enableEmailBatching,
    isCRTEnabled,
    sendEmailNotifications,
}: NotificationEmailProps) => {
    const intl = useIntl();
    const [notifyInterval, setNotifyInterval] = useState<EmailInterval>(emailInterval);
    const [emailThreads, setEmailThreads] = useState<EmailThreads>(emailInterval);
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const notifyProps = getNotificationProps(currentUser);

    const setEmailInterval = useCallback((interval: EmailInterval) => {
        setNotifyInterval(interval);
    }, []);

    const handleEmailThreadsChanged = useCallback((thread: EmailThreads) => {
        setEmailThreads(thread);
    }, []);

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
                                label={intl.formatMessage({id: 'notification_settings.email.immediately', defaultMessage: 'Immediately'})}
                                selected={notifyInterval === Preferences.INTERVAL_IMMEDIATE.toString()}
                                testID='notification_settings.email.immediately.action'
                                type='select'
                                value={Preferences.INTERVAL_IMMEDIATE.toString()}
                            />
                            <View style={styles.separator}/>
                            {enableEmailBatching &&
                                <View>
                                    <OptionItem
                                        action={setEmailInterval}
                                        label={intl.formatMessage({id: 'notification_settings.email.fifteenMinutes', defaultMessage: 'Every 15 minutes'})}
                                        selected={notifyInterval === Preferences.INTERVAL_FIFTEEN_MINUTES.toString()}
                                        type='select'
                                        value={Preferences.INTERVAL_FIFTEEN_MINUTES.toString()}
                                    />
                                    <View style={styles.separator}/>
                                    <OptionItem
                                        action={setEmailInterval}
                                        label={intl.formatMessage({id: 'notification_settings.email.everyHour', defaultMessage: 'Every hour'})}
                                        selected={notifyInterval === Preferences.INTERVAL_HOUR.toString()}
                                        type='select'
                                        value={Preferences.INTERVAL_HOUR.toString()}
                                    />
                                    <View style={styles.separator}/>
                                </View>
                            }
                            <OptionItem
                                action={setEmailInterval}
                                label={intl.formatMessage({id: 'notification_settings.email.never', defaultMessage: 'Never'})}
                                selected={notifyInterval === Preferences.INTERVAL_NEVER.toString()}
                                testID='notification_settings.email.never.action'
                                type='select'
                                value={Preferences.INTERVAL_NEVER.toString()}
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
                { isCRTEnabled && notifyProps.email === 'true' && (
                    <Block
                        footerText={emailFooterCRTText}
                        headerStyles={styles.upperCase}
                        headerText={emailHeaderCRTText}
                    >
                        <OptionItem
                            action={handleEmailThreadsChanged}
                            label={intl.formatMessage({id: 'user.settings.notifications.email_threads.description', defaultMessage: 'Notify me about all replies to threads I\'m following'})}
                            selected={emailThreads === 'all'}
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
