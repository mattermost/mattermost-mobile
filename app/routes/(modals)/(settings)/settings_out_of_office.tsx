// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import OutOfOffice from '@screens/settings/out_of_office';

export default function SettingsOutOfOfficeRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'notification_settings.out_of_office', defaultMessage: 'Out of Office'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<OutOfOffice/>);
}
