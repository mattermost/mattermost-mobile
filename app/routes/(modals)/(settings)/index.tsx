// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {navigateBack} from '@screens/navigation';
import SettingsScreen from '@screens/settings';

export default function SettingsRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.screen.settings', defaultMessage: 'Settings'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.settings.button'),
        },
    });

    return (<SettingsScreen/>);
}
