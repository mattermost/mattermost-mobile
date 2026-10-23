// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useFocusEffect} from 'expo-router';
import {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import {setVisiblePlaybookRun} from '@playbooks/actions/local/task_activity';
import {ensurePlaybookRunActivityFresh} from '@playbooks/actions/remote/runs';
import PlaybookRunScreen from '@playbooks/screens/playbook_run';

type PlaybookRunRouteProps = {
    playbookRunId: string;
    playbookRun?: PlaybookRun;
}

export default function PlaybookRunRoute() {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const props = usePropsFromParams<PlaybookRunRouteProps>();

    useFocusEffect(useCallback(() => {
        if (props.playbookRunId && !props.playbookRun) {
            setVisiblePlaybookRun(serverUrl, props.playbookRunId);
            ensurePlaybookRunActivityFresh(serverUrl, props.playbookRunId);
            return () => setVisiblePlaybookRun(serverUrl, null);
        }
        return undefined;
    }, [props.playbookRunId, props.playbookRun, serverUrl]));

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'playbooks.playbook_run.title', defaultMessage: 'Playbook checklist'}),
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookRunScreen {...props}/>;
}
