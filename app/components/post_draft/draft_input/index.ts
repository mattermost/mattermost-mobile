// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeVoiceMessagesEnabled} from '@queries/servers/system';

import DraftInput from './draft_input';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        voiceMessageEnabled: observeVoiceMessagesEnabled(database),
    };
});

export default withDatabase(enhanced(DraftInput));
