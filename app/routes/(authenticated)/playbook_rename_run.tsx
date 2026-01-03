// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybookRenameRunScreen from '@playbooks/screens/playbook_run/rename_playbook_run_bottom_sheet';

type Props = {
    currentTitle: string;
    playbookRunId: string;
}

export default function PlaybookRenameRunRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const props = usePropsFromParams<Props>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'playbooks.playbook_run.rename.title', defaultMessage: 'Rename playbook run'}),
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookRenameRunScreen {...props}/>;
}
