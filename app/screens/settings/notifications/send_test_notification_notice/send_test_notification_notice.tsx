// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {sendTestNotification} from '@actions/remote/notifications';
import SectionNotice from '@components/section_notice';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useExternalLink} from '@hooks/use_external_link';
import {isMinimumServerVersion} from '@utils/helpers';
import {logError} from '@utils/log';
import {tryOpenURL} from '@utils/url';

const TIME_TO_IDLE = 3000;

type Props = {
    serverVersion: string;
    userId: string;
isCloud: boolean;
telemetryId: string;
}

type ButtonState = 'idle'|'sending'|'sent'|'error';

const styles = {
    wrapper: {
        flex: 1,
        justifyContent: 'flex-end' as const,
        margin: 16,
    },
};

const SendTestNotificationNotice = ({
    serverVersion,
    userId,
    isCloud,
    telemetryId,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [buttonState, setButtonState] = useState<ButtonState>('idle');
    const isSending = useRef(false);
    const timeout = useRef<NodeJS.Timeout>();

    const [href] = useExternalLink({
        userId,
        isCloud,
        telemetryId,
    }, 'https://mattermost.com/pl/troubleshoot-notifications');

    const onGoToNotificationDocumentation = useCallback(() => {
        tryOpenURL(href);
    }, [href]);

    const onSendTestNotificationClick = useCallback(async () => {
        if (isSending.current) {
            return;
        }

        isSending.current = true;
        setButtonState('sending');
        const result = await sendTestNotification(serverUrl);
        if (result.error) {
            logError(result);
            setButtonState('error');
        } else {
            setButtonState('sent');
        }
        timeout.current = setTimeout(() => {
            isSending.current = false;
            setButtonState('idle');
        }, TIME_TO_IDLE);
    }, [serverUrl]);

    useEffect(() => {
        return () => {
            clearTimeout(timeout.current);
        };
    }, []);

    const primaryButton = useMemo(() => {
        let text;
        let icon;
        let loading;
        switch (buttonState) {
            case 'idle':
                text = intl.formatMessage({id: 'user_settings.notifications.test_notification.send_button.send', defaultMessage: 'Send a test notification'});
                break;
            case 'sending':
                text = intl.formatMessage({id: 'user_settings.notifications.test_notification.send_button.sending', defaultMessage: 'Sending a test notification'});
                loading = true;
                break;
            case 'sent':
                text = intl.formatMessage({id: 'user_settings.notifications.test_notification.send_button.sent', defaultMessage: 'Test notification sent'});
                icon = 'check';
                break;
            case 'error':
                text = intl.formatMessage({id: 'user_settings.notifications.test_notification.send_button.error', defaultMessage: 'Error sending test notification'});
                icon = 'alert-outline';
        }
        return {
            onClick: onSendTestNotificationClick,
            text,
            leadingIcon: icon,
            loading,
        };
    }, [buttonState, intl, onSendTestNotificationClick]);

    const secondaryButton = useMemo(() => {
        return {
            onClick: onGoToNotificationDocumentation,
            text: intl.formatMessage({id: 'user_settings.notifications.test_notification.go_to_docs', defaultMessage: 'Troubleshooting docs'}),
            trailingIcon: 'open-in-new',
        };
    }, [intl, onGoToNotificationDocumentation]);

    if (!isMinimumServerVersion(serverVersion, 10, 3)) {
        return null;
    }

    return (
        <View style={styles.wrapper}>
            <SectionNotice
                text={intl.formatMessage({
                    id: 'user_settings.notifications.test_notification.body',
                    defaultMessage: 'Not receiving notifications? Start by sending a test notification to all your devices to check if they’re working as expected. If issues persist, explore ways to solve them with troubleshooting steps.',
                })}
                title={intl.formatMessage({id: 'user_settings.notifications.test_notification.title', defaultMessage: 'Troubleshooting notifications'})}
                primaryButton={primaryButton}
                secondaryButton={secondaryButton}
                type='hint'
                location={Screens.SETTINGS_NOTIFICATION_PUSH}
            />
        </View>
    );
};

export default SendTestNotificationNotice;
