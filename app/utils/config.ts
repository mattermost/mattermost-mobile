// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isMinimumServerVersion} from './helpers';

export function hasReliableWebsocket(config: ClientConfig) {
    if (isMinimumServerVersion(config.Version, 6, 5)) {
        return true;
    }

    return config.EnableReliableWebSockets === 'true';
}
