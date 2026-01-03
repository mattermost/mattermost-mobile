// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import TableScreen, {type TableScreenProps} from '@screens/table';

export default function IntegrationSelectorRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const props = usePropsFromParams<TableScreenProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.routes.table', defaultMessage: 'Table'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<TableScreen {...props}/>);
}
