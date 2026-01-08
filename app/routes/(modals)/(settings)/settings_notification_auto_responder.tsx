// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsNotificationAutoResponderScreen from '@screens/settings/notification_auto_responder';

export default function SettingsNotificationAutoResponderRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'notification_settings.auto_responder', defaultMessage: 'Automatic Replies'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsNotificationAutoResponderScreen/>);
}
