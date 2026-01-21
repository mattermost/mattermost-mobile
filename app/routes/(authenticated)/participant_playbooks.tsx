// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import ParticipantPlaybooksScreen from '@playbooks/screens/participant_playbooks';

export default function ParticipantPlaybooksRoute() {
    const theme = useTheme();
    const intl = useIntl();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'playbooks.participant_playbooks.title', defaultMessage: 'Playbook checklists'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<ParticipantPlaybooksScreen/>);
}
