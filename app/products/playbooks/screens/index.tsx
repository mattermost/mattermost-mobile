// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withServerDatabase} from '@database/components';
import Screens from '@playbooks/constants/screens';

export function loadPlaybooksScreen(screenName: string | number) {
    switch (screenName) {
        case Screens.PLAYBOOKS_RUNS:
            return withServerDatabase(require('@playbooks/screens/playbooks_runs').default);
        case Screens.PARTICIPANT_PLAYBOOKS:
            return withServerDatabase(require('@playbooks/screens/participant_playbooks').default);
        case Screens.PLAYBOOK_RUN:
            return withServerDatabase(require('@playbooks/screens/playbook_run').default);
        case Screens.PLAYBOOK_EDIT_COMMAND:
            return withServerDatabase(require('@playbooks/screens/edit_command').default);
        case Screens.PLAYBOOK_POST_UPDATE:
            return withServerDatabase(require('@playbooks/screens/post_update').default);
        case Screens.PLAYBOOK_SELECT_USER:
            return withServerDatabase(require('@playbooks/screens/select_user').default);
        case Screens.PLAYBOOKS_SELECT_DATE:
            return withServerDatabase(require('@playbooks/screens/select_date').default);
        case Screens.PLAYBOOKS_SELECT_PLAYBOOK:
            return withServerDatabase(require('@playbooks/screens/select_playbook').default);
        case Screens.PLAYBOOKS_START_A_RUN:
            return withServerDatabase(require('@playbooks/screens/start_a_run').default);
        default:
            return undefined;
    }
}
