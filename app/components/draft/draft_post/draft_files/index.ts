// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';

import Files from '@app/components/files/files';
import {observeCanDownloadFiles, observeConfigBooleanValue} from '@queries/servers/system';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(['draftId'], ({database, draftId}: WithDatabaseArgs & {draftId: string}) => {
    const publicLinkEnabled = observeConfigBooleanValue(database, 'EnablePublicLink');

    return {
        canDownloadFiles: observeCanDownloadFiles(database),
        publicLinkEnabled,
        postId: of$(draftId),
        postProps: of$({}),
    };
});

export default withDatabase(enhance(Files));
