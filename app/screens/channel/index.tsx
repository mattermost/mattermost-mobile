// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, switchMap} from 'rxjs';

import {observeCallStateInChannel, observeIsCallsEnabledInChannel} from '@calls/observers';
import {Preferences} from '@constants';
import {withServerUrl} from '@context/server';
import {observeCurrentChannel} from '@queries/servers/channel';
import {observeHasGMasDMFeature} from '@queries/servers/features';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';

import Channel from './channel';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
}

const enhanced = withObservables([], ({database, serverUrl}: EnhanceProps) => {
    const channelId = observeCurrentChannelId(database);
    const dismissedGMasDMNotice = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.SYSTEM_NOTICE, Preferences.NOTICES.GM_AS_DM).observe();
    const channelType = observeCurrentChannel(database).pipe(switchMap((c) => of$(c?.type)));
    const currentUserId = observeCurrentUserId(database);
    const hasGMasDMFeature = observeHasGMasDMFeature(database);

    return {
        channelId,
        ...observeCallStateInChannel(serverUrl, database, channelId),
        isCallsEnabledInChannel: observeIsCallsEnabledInChannel(database, serverUrl, channelId),
        dismissedGMasDMNotice,
        channelType,
        currentUserId,
        hasGMasDMFeature,
    };
});

export default withDatabase(withServerUrl(enhanced(Channel)));
