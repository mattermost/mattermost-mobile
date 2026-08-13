// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsNotificationsPushScreen from '@screens/settings/notification_push';

export default function SettingsNotificationPushRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'notification_settings.push_notification', defaultMessage: 'Push Notifications'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsNotificationsPushScreen/>);
}
