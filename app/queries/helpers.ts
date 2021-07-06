// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isMinimumServerVersion} from '@utils/helpers';

import type {Config} from '@typings/database/models/servers/config';

export function isCustomStatusEnabled(config: Config) {
    const serverVersion = config.Version;
    return config?.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(serverVersion, 5, 36);
}

