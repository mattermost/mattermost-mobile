// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import CreateDirectMessageScreen from '@screens/create_direct_message';
import {navigateBack} from '@screens/navigation';

export default function CreateDirectMessageRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'create_direct_message.title', defaultMessage: 'Create Direct Message'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.create_direct_message.button'),
        },
    });

    return <CreateDirectMessageScreen/>;
}
