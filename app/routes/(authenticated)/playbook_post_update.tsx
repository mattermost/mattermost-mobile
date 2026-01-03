// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybookPostUpdateScreen from '@playbooks/screens/post_update';

type PlaybookPostUpdateRouteProps = {
    playbookRunId: string;
}

export default function PlaybookPostUpdateRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const props = usePropsFromParams<PlaybookPostUpdateRouteProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'playbooks.post_update.title', defaultMessage: 'Post update'}),
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookPostUpdateScreen {...props}/>;
}
