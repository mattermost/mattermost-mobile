// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useLocalSearchParams} from 'expo-router';
import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import SettingsDisplayTimezoneSelectScreen from '@screens/settings/display_timezone_select';

type Props = {
    currentTimezone: string;
}

export default function SettingsDisplayTimezoneSelectRoute() {
    const {currentTimezone} = useLocalSearchParams<Props>();
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'settings_display.timezone.select', defaultMessage: 'Select Timezone'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsDisplayTimezoneSelectScreen currentTimezone={currentTimezone}/>);
}
