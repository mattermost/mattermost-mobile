// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybookRunScreen from '@playbooks/screens/playbook_run';

type PlaybookRunRouteProps = {
    playbookRunId: string;
    playbookRun?: PlaybookRun;
}

export default function PlaybookRunRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const props = usePropsFromParams<PlaybookRunRouteProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'playbooks.playbook_run.title', defaultMessage: 'Playbook checklist'}),
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookRunScreen {...props}/>;
}
