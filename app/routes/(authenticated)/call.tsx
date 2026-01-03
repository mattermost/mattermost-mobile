// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import CallScreen from '@calls/screens/call_screen';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';

export default function IntegrationSelectorRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.calls_call_screen', defaultMessage: 'Call'}),
            ...getHeaderOptions(theme),
            contentStyle: {backgroundColor: '#000000'},
            headerStyle: {backgroundColor: '#000000'},
            headerShown: false,
        },
    });

    return (<CallScreen/>);
}
