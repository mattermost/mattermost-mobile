// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsNotificationEmailScreen from '@screens/settings/notification_email';

export default function SettingsNotificationEmailRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'notification_settings.email', defaultMessage: 'Email Notifications'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsNotificationEmailScreen/>);
}
