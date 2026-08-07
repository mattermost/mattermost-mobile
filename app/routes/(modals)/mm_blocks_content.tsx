// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import MmBlocksContentScreen from '@screens/mm_blocks_content';
import {navigateBack} from '@screens/navigation';

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
            ...getModalHeaderOptions(theme, navigateBack, 'close.mm_blocks_content.button'),
        },
    });

    return <MmBlocksContentScreen/>;
}
