// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsAdvancedScreen from '@screens/settings/advanced';

export default function SettingsAdvancedRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'settings.advanced_settings', defaultMessage: 'Advanced Settings'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsAdvancedScreen/>);
}
