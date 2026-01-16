// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsNotificationsScreen from '@screens/settings/notifications';

export default function SettingsNotificationsRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'settings.notifications', defaultMessage: 'Notifications'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsNotificationsScreen/>);
}
