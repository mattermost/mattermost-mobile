// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toMilliseconds} from '@utils/datetime';

const PluginId = 'playbooks';

const RefreshConfigMillis = toMilliseconds({minutes: 20});

export default {
    PluginId,
    RefreshConfigMillis,
};
