// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsDisplayTimezoneScreen from '@screens/settings/display_timezone';

export default function SettingsDisplayTimezoneRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'display_settings.timezone', defaultMessage: 'Timezone'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsDisplayTimezoneScreen/>);
}
