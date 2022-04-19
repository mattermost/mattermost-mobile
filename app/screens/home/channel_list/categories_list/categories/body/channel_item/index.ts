// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {observeMyChannel} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';
import ChannelModel from '@typings/database/models/servers/channel';
import MyChannelModel from '@typings/database/models/servers/my_channel';

import ChannelItem from './channel_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const observeIsMutedSetting = (mc: MyChannelModel) => mc.settings.observe().pipe(switchMap((s) => of$(s?.notifyProps?.mark_unread === 'mention')));

const enhance = withObservables(['channel', 'isUnreads'], ({channel, isUnreads, database}: {channel: ChannelModel; isUnreads?: boolean} & WithDatabaseArgs) => {
    const currentUserId = observeCurrentUserId(database);
    const myChannel = observeMyChannel(database, channel.id);

    const isActive = observeCurrentChannelId(database).pipe(switchMap((id) => of$(id ? id === channel.id : false)), distinctUntilChanged());
    const unreadsOnTop = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
        observeWithColumns(['value']).
        pipe(
            switchMap((prefs: PreferenceModel[]) => of$(getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false))),
        );

    const isVisible = combineLatest([myChannel, unreadsOnTop]).pipe(
        switchMap(([mc, u]) => {
            if (!mc) {
                return of$(false);
            }
            if (isUnreads) {
                return of$(u);
            }

            return u ? of$(!mc.isUnread) : of$(true);
        }),
    );

    const isMuted = myChannel.pipe(
        switchMap((mc) => {
            if (!mc) {
                return of$(false);
            }
            return observeIsMutedSetting(mc);
        }),
    );

    return {
        currentUserId,
        isMuted,
        isActive,
        isVisible,
        myChannel,
        channel: channel.observe(),
    };
});

export default React.memo(withDatabase(enhance(ChannelItem)));
