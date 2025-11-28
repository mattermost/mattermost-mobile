// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Screens from '@agents/constants/screens';

import {withServerDatabase} from '@database/components';

export function loadAgentsScreen(screenName: string | number) {
    switch (screenName) {
        case Screens.AGENT_CHAT:
            return withServerDatabase(require('@agents/screens/agent_chat').default);
        case Screens.AGENT_THREADS_LIST:
            return withServerDatabase(require('@agents/screens/agent_threads_list').default);
        default:
            return undefined;
    }
}
