// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel, observeChannelAutotranslation, observeMyChannelAutotranslation} from '@queries/servers/channel';
import {observeIsUserLanguageSupportedByAutotranslation} from '@queries/servers/system';

import MyAutotranslation from './my_autotranslation';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const enabled = observeMyChannelAutotranslation(database, channelId);
    const channelAutotranslationEnabled = observeChannelAutotranslation(database, channelId);
    const isLanguageSupported = observeIsUserLanguageSupportedByAutotranslation(database);

    return {
        enabled,
        displayName: channel.pipe(switchMap((c) => of$(c?.displayName || ''))),
        channelAutotranslationEnabled,
        isLanguageSupported,
    };
});

export default withDatabase(enhanced(MyAutotranslation));

