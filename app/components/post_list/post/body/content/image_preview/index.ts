// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import ImagePreview from './image_preview';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const enhance = withObservables(['metadata'], ({database, metadata}: WithDatabaseArgs & {metadata: PostMetadata}) => {
    const link = metadata.embeds?.[0].url;

    return {
        expandedLink: database.get(MM_TABLES.SERVER.SYSTEM).query(
            Q.where('id', SYSTEM_IDENTIFIERS.EXPANDED_LINKS),
        ).observe().pipe(
            switchMap((values: SystemModel[]) => (
                (link && values.length) ? of$((values[0].value as Record<string, string>)[link]) : of$(undefined)),
            ),
        ),
        link: of$(link),
    };
});

export default withDatabase(enhance(ImagePreview));
