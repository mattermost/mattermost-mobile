// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigBooleanValue} from '@queries/servers/system';

import ExternalImage from './external_image';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => ({
    enableSVGs: observeConfigBooleanValue(database, 'EnableSVGs'),
    hasImageProxy: observeConfigBooleanValue(database, 'HasImageProxy'),
}));

export default withDatabase(enhance(ExternalImage));
