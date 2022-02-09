// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Database, General} from '@constants';
import {getUserIdFromChannelName} from '@utils/user';

import Channel from './channel';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {MM_TABLES, SYSTEM_IDENTIFIERS} = Database;
const {SERVER: {CHANNEL, CHANNEL_INFO, SYSTEM, USER}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUserId = database.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}: {value: string}) => of$(value)),
    );

    const channelId = database.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID).pipe(
        switchMap(({value}: {value: string}) => of$(value)),
    );
    const teamId = database.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        switchMap(({value}: {value: string}) => of$(value)),
    );

    const channel = channelId.pipe(
        switchMap((id) => database.get<ChannelModel>(CHANNEL).query(Q.where('id', id)).observe().pipe(
            // eslint-disable-next-line max-nested-callbacks
            switchMap((channels) => {
                if (channels.length) {
                    return channels[0].observe();
                }

                return of$(null);
            }),
        )),
    );

    const channelInfo = channelId.pipe(
        switchMap((id) => database.get<ChannelInfoModel>(CHANNEL_INFO).query(Q.where('id', id)).observe().pipe(
            // eslint-disable-next-line max-nested-callbacks
            switchMap((infos) => {
                if (infos.length) {
                    return infos[0].observe();
                }

                return of$(null);
            }),
        )),
    );

    const isOwnDirectMessage = combineLatest([currentUserId, channel]).pipe(
        switchMap(([userId, ch]) => {
            if (ch?.type === General.DM_CHANNEL) {
                const teammateId = getUserIdFromChannelName(userId, ch.name);
                return of$(userId === teammateId);
            }

            return of$(false);
        }),
    );

    const displayName = channel.pipe(switchMap((c) => of$(c?.displayName)));
    const name = combineLatest([currentUserId, channel]).pipe(switchMap(([userId, c]) => {
        if (c?.type === General.DM_CHANNEL) {
            const teammateId = getUserIdFromChannelName(userId, c.name);
            return database.get<UserModel>(USER).findAndObserve(teammateId).pipe(
                // eslint-disable-next-line max-nested-callbacks
                switchMap((u) => of$(`@${u.username}`)),
            );
        } else if (c?.type === General.GM_CHANNEL) {
            return of$(`@${c.name}`);
        }

        return of$(c?.name);
    }));
    const memberCount = channelInfo.pipe(switchMap((ci) => of$(ci?.memberCount || 0)));

    return {
        channelId,
        displayName,
        isOwnDirectMessage,
        memberCount,
        name,
        teamId,
    };
});

export default withDatabase(enhanced(Channel));
