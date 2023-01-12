// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observeConfigBooleanValue, observeRecentReactions} from '@queries/servers/system';

import Picker from './picker';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    customEmojisEnabled: observeConfigBooleanValue(database, 'EnableCustomEmoji'),
    customEmojis: queryAllCustomEmojis(database).observe(),
    recentEmojis: observeRecentReactions(database),
}));

export default withDatabase(enhanced(Picker));
