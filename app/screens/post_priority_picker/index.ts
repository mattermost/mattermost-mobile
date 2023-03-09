// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeIsPostAcknowledgementsEnabled, observePersistentNotificationsEnabled} from '@queries/servers/post';

import PostPriorityPicker from './post_priority_picker';

import type {Database} from '@nozbe/watermelondb';

const enhanced = withObservables([], ({database}: {database: Database}) => {
    return {
        isPostAcknowledgementEnabled: observeIsPostAcknowledgementsEnabled(database),
        isPersistenNotificationsEnabled: observePersistentNotificationsEnabled(database),
    };
});

export default withDatabase(enhanced(PostPriorityPicker));
