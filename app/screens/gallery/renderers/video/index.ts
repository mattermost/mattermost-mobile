// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeEnableSecureFilePreview, observeCanDownloadFiles} from '@queries/servers/security';

import VideoRenderer from './video_renderer';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => ({
    canDownloadFiles: observeCanDownloadFiles(database),
    enableSecureFilePreview: observeEnableSecureFilePreview(database),
}));

export default withDatabase(enhance(VideoRenderer));
