// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import MmBlocksContentScreen from '@screens/mm_blocks_content';

export default function MmBlocksContentRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({
                id: 'mobile.routes.mm_blocks_content',
                defaultMessage: 'Scrollable content',
            }),
            ...getHeaderOptions(theme),
        },
    });

    return <MmBlocksContentScreen/>;
}
