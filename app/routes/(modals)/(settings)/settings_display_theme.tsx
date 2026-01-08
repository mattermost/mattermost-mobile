// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsDisplayThemeScreen from '@screens/settings/display_theme';

export default function SettingsDisplayThemeRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'display_settings.theme', defaultMessage: 'Theme'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsDisplayThemeScreen/>);
}
