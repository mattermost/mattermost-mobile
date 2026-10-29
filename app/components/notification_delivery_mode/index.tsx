// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import RadioSetting from '@components/settings/radio_setting';
import {NotificationDeliveryMode, normalizeNotificationDeliveryMode} from '@managers/direct_notification/mode';

import type {AvailableScreens} from '@typings/screens/navigation';

const messages = defineMessages({
    label: {
        id: 'encma.notification_delivery.label',
        defaultMessage: 'Notification delivery',
    },
    direct: {
        id: 'encma.notification_delivery.direct',
        defaultMessage: 'Direct from this server',
    },
    serverPush: {
        id: 'encma.notification_delivery.server_push',
        defaultMessage: 'Server push',
    },
    off: {
        id: 'encma.notification_delivery.off',
        defaultMessage: 'Off',
    },
    directHelp: {
        id: 'encma.notification_delivery.direct_help',
        defaultMessage: 'Uses the existing server WebSocket and a persistent Android status notification while ENCMA is backgrounded. Requires WireGuard and notification permission. New Direct logins do not register an FCM device token.',
    },
    serverPushHelp: {
        id: 'encma.notification_delivery.server_push_help',
        defaultMessage: 'Uses the Mattermost server’s configured push service, normally Mattermost → push proxy → FCM on Android.',
    },
    offHelp: {
        id: 'encma.notification_delivery.off_help',
        defaultMessage: 'No background notification delivery for this server.',
    },
});

type Props = {
    location: AvailableScreens;
    onChange: (mode: NotificationDeliveryMode) => void;
    testID?: string;
    value: NotificationDeliveryMode;
};

const NotificationDeliveryModeSelector = ({location, onChange, testID = 'notification_delivery_mode', value}: Props) => {
    const intl = useIntl();
    const handleChange = useCallback((nextValue: string) => {
        onChange(normalizeNotificationDeliveryMode(nextValue));
    }, [onChange]);

    let helpText = messages.serverPushHelp;
    if (value === NotificationDeliveryMode.DIRECT) {
        helpText = messages.directHelp;
    } else if (value === NotificationDeliveryMode.OFF) {
        helpText = messages.offHelp;
    }

    return (
        <RadioSetting
            helpText={intl.formatMessage(helpText)}
            label={intl.formatMessage(messages.label)}
            location={location}
            onChange={handleChange}
            options={[
                {value: NotificationDeliveryMode.DIRECT, text: intl.formatMessage(messages.direct)},
                {value: NotificationDeliveryMode.SERVER_PUSH, text: intl.formatMessage(messages.serverPush)},
                {value: NotificationDeliveryMode.OFF, text: intl.formatMessage(messages.off)},
            ]}
            testID={testID}
            value={value}
        />
    );
};

export default NotificationDeliveryModeSelector;
