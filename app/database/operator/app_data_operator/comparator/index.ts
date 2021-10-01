// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type GlobalModel from '@typings/database/models/app/global';
import type InfoModel from '@typings/database/models/app/info';

export const isRecordInfoEqualToRaw = (record: InfoModel, raw: AppInfo) => {
    return (raw.build_number === record.buildNumber && raw.version_number === record.versionNumber);
};

export const isRecordGlobalEqualToRaw = (record: GlobalModel, raw: IdValue) => {
    return raw.id === record.id && raw.value === record.value;
};
