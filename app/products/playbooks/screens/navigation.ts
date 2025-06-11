// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';

import type {IntlShape} from 'react-intl';

export function goToPlaybookRuns(intl: IntlShape, channelId: string, channelName: string) {
    const title = intl.formatMessage({id: 'playbooks.playbooks_runs.title', defaultMessage: 'Playbook runs'});
    goToScreen(Screens.PLAYBOOKS_RUNS, title, {channelId}, {
        topBar: {
            subtitle: {
                text: channelName,
            },
        },
    });
}

export async function goToPlaybookRun(intl: IntlShape, playbookRunId: string, playbookRun?: PlaybookRun) {
    const title = intl.formatMessage({id: 'playbooks.playbook_run.title', defaultMessage: 'Playbook run'});
    goToScreen(Screens.PLAYBOOK_RUN, title, {playbookRunId, playbookRun}, {});
}
