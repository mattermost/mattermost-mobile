// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import SettingsDisplayTimezoneSelectScreen from '@screens/settings/display_timezone_select';

type Props = {
    currentTimezone: string;
}

export default function SettingsDisplayTimezoneSelectRoute() {
    const {currentTimezone} = usePropsFromParams<Props>();
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
