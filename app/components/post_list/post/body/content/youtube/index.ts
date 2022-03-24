// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeConfigValue} from '@queries/servers/system';

import YouTube from './youtube';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => ({
    googleDeveloperKey: observeConfigValue(database, 'GoogleDeveloperKey'),
}));

export default withDatabase(enhance(YouTube));
