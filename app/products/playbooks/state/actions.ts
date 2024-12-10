// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    getPlaybooksConfig,
    setPlaybooksConfig,
} from '@playbooks/state';
import {
    type PlaybooksConfigState,
} from '@playbooks/types/playbooks';

export const setConfig = (serverUrl: string, config: Partial<PlaybooksConfigState>) => {
    const playbooksConfig = getPlaybooksConfig(serverUrl);
    setPlaybooksConfig(serverUrl, {...playbooksConfig, ...config});
};

export const setPluginEnabled = (serverUrl: string, pluginEnabled: boolean) => {
    const playbooksConfig = getPlaybooksConfig(serverUrl);
    setPlaybooksConfig(serverUrl, {...playbooksConfig, pluginEnabled});
};
