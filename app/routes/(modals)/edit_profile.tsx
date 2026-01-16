// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import EditProfileScreen from '@screens/edit_profile';
import {navigateBack} from '@screens/navigation';

export default function EditProfileRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.screen.your_profile', defaultMessage: 'Your Profile'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.edit_profile.button'),
        },
    });

    return (<EditProfileScreen/>);
}
