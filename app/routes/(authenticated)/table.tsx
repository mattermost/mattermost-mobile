// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessage, useIntl} from 'react-intl';

import {useAppNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import TableScreen, {type TableScreenProps} from '@screens/table';

const tableMessage = defineMessage({
    id: 'mobile.routes.table',
    defaultMessage: 'Table',
});

export default function TableRoute() {
    const intl = useIntl();
    const props = usePropsFromParams<TableScreenProps>();

    useAppNavigationHeader(intl.formatMessage(tableMessage));

    return (<TableScreen {...props}/>);
}
