// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isMinimumServerVersion} from './helpers';

export function hasReliableWebsocket(version?: string, reliableWebsocketsConfig?: string) {
    if (version && isMinimumServerVersion(version, 6, 5)) {
        return true;
    }

    return reliableWebsocketsConfig === 'true';
}

// True when the server's FeatureFlagEnableExperienceAPI is the string "true".
// Older servers omit the field — defaults to false.
export function isExperienceAPIEnabled(config?: Pick<ClientConfig, 'FeatureFlagEnableExperienceAPI'>): boolean {
    return config?.FeatureFlagEnableExperienceAPI === 'true';
}
