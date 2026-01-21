// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsComponentLibraryScreen from '@screens/component_library';

export default function SettingsComponentLibraryRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'settings.advanced_settings.component_library', defaultMessage: 'Component library'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsComponentLibraryScreen/>);
}
