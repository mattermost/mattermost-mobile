// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybookCreateQuickChecklistScreen, {type PlaybookCreateQuickChecklistScreenProps} from '@playbooks/screens/create_quick_checklist';

export default function PlaybookCreateQuickChecklistRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const props = usePropsFromParams<PlaybookCreateQuickChecklistScreenProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.playbook.create_checklist', defaultMessage: 'Create Checklist'}),
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookCreateQuickChecklistScreen {...props}/>;
}
