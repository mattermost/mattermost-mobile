// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsDisplayCRTScreen from '@screens/settings/display_crt';

export default function SettingsDisplayCRTRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'display_settings.crt', defaultMessage: 'Collapsed Reply Threads'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsDisplayCRTScreen/>);
}
