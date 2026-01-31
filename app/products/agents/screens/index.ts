// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Screens from '@agents/constants/screens';

import {withServerDatabase} from '@database/components';

export function loadAgentsScreen(screenName: string | number) {
    switch (screenName) {
        case Screens.AGENTS_SELECTOR:
            return withServerDatabase(require('@agents/screens/agent_selector').default);
        case Screens.AGENTS_REWRITE_OPTIONS:
            return withServerDatabase(require('@agents/screens/rewrite_options').default);
        default:
            return undefined;
    }
}
