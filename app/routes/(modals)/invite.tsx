// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import InviteScreen from '@screens/invite';
import {navigateBack} from '@utils/navigation/adapter';

export default function InviteRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'invite.title', defaultMessage: 'Invite'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.invite.button'),
        },
    });

    return (<InviteScreen/>);
}
