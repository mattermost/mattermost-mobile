// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybookRunsScreen from '@playbooks/screens/playbooks_runs';

type PlaybookRunsRouteProps = {
    inModal?: boolean;
    channelId: string;
    channelName?: string;
}

export default function PlaybookRunsRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const {channelId, channelName} = usePropsFromParams<PlaybookRunsRouteProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({id: 'playbooks.playbooks_runs.title', defaultMessage: 'Playbook checklists'})}
                    subtitle={channelName}
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookRunsScreen channelId={channelId}/>;
}
