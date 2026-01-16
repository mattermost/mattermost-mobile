// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsNotificationCallScreen from '@screens/settings/notification_call';

export default function SettingsNotificationCallRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'notification_settings.call_notification', defaultMessage: 'Call Notifications'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsNotificationCallScreen/>);
}
