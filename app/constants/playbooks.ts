// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toMilliseconds} from '@utils/datetime';

const PluginId = 'playbooks';

const RefreshConfigMillis = toMilliseconds({minutes: 20});

const RequiredServer = {
    FULL_VERSION: '9.11.0',
    MAJOR_VERSION: 9,
    MIN_VERSION: 11,
    PATCH_VERSION: 0,
};

export default {
    PluginId,
    RefreshConfigMillis,
    RequiredServer,
};
