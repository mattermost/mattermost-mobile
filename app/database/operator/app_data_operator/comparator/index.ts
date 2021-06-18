// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import App from '@typings/database/app';
import {RawApp, RawGlobal, RawServers} from '@typings/database/database';
import Global from '@typings/database/global';
import Servers from '@typings/database/servers';

export const isRecordAppEqualToRaw = (record: App, raw: RawApp) => {
    return (raw.build_number === record.buildNumber && raw.version_number === record.versionNumber);
};

export const isRecordGlobalEqualToRaw = (record: Global, raw: RawGlobal) => {
    return raw.name === record.name && raw.value === record.value;
};

export const isRecordServerEqualToRaw = (record: Servers, raw: RawServers) => {
    return raw.url === record.url && raw.db_path === record.dbPath;
};
