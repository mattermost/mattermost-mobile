// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeIsPostAcknowledgementsEnabled, observePersistentNotificationsEnabled} from '@queries/servers/post';

import {observeConfigIntValue} from '../../queries/servers/system';

import PostPriorityPicker from './post_priority_picker';

import type {Database} from '@nozbe/watermelondb';

const enhanced = withObservables([], ({database}: {database: Database}) => {
    const persistentNotificationInterval = observeConfigIntValue(database, 'PersistentNotificationIntervalMinutes');

    return {
        isPostAcknowledgementEnabled: observeIsPostAcknowledgementsEnabled(database),
        isPersistenNotificationsEnabled: observePersistentNotificationsEnabled(database),
        persistentNotificationInterval,
    };
});

export default withDatabase(enhanced(PostPriorityPicker));
