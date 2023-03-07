// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isMinimumServerVersion} from './helpers';

export function hasReliableWebsocket(version?: string, reliableWebsocketsConfig?: string) {
    if (version && isMinimumServerVersion(version, 6, 5)) {
        return true;
    }

    return reliableWebsocketsConfig === 'true';
}
