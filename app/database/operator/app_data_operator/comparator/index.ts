// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type InfoModel from '@typings/database/models/app/info';

export const buildAppInfoKey = (info: InfoModel | AppInfo) => {
    if ('build_number' in info) {
        return `${info.version_number}-${info.build_number}`;
    }

    return `${info.versionNumber}-${info.buildNumber}`;
};
