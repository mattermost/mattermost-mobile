// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import {navigateBack} from '@screens/navigation';
import RescheduleDraftScreen, {type RescheduleDraftProps} from '@screens/reschedule_draft';

export default function RescheduleDraftRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const props = usePropsFromParams<RescheduleDraftProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.reschedule_draft.title', defaultMessage: 'Change Schedule'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.reschedule_draft.button'),
        },
    });

    return (<RescheduleDraftScreen {...props}/>);
}
