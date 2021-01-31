// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@mm-redux/client';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';

export function maxFileCount() {
    return isMinimumServerVersion(Client4.serverVersion, 5, 32) ? 10 : 5;
}
