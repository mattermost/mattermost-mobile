// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import CustomStatusScreen from '@screens/custom_status';
import {navigateBack} from '@utils/navigation/adapter';

export default function CustomStatusRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.routes.custom_status', defaultMessage: 'Set a custom status'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.custom_status.button'),
        },
    });

    return (<CustomStatusScreen/>);
}
