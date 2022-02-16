// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// groups: MM-41882 import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$, from as from$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {hasPermissionForChannel} from '@utils/role';

import SendHandler from './send_handler';

// groups: MM-41882 import type GroupModel from '@typings/database/models/servers/group';
import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

// groups: MM-41882 const {SERVER: {SYSTEM, USER, CHANNEL, GROUP, GROUPS_TEAM, GROUPS_CHANNEL, CUSTOM_EMOJI}} = MM_TABLES;
const {SERVER: {SYSTEM, USER, CHANNEL, CUSTOM_EMOJI}} = MM_TABLES;

type OwnProps = {
    rootId: string;
    channelId: string;
    channelIsArchived?: boolean;
}

const enhanced = withObservables([], (ownProps: WithDatabaseArgs & OwnProps) => {
    const database = ownProps.database;
    const {rootId, channelId} = ownProps;
    let channel;
    if (rootId) {
        channel = database.get<ChannelModel>(CHANNEL).findAndObserve(channelId);
    } else {
        channel = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID).pipe(
            switchMap((t) => database.get<ChannelModel>(CHANNEL).findAndObserve(t.value)),
        );
    }

    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => of$(value)),
    );
    const currentUser = currentUserId.pipe(
        switchMap((id) => database.get<UserModel>(USER).findAndObserve(id)),
    );
    const userIsOutOfOffice = currentUser.pipe(
        switchMap((u) => of$(u.status === General.OUT_OF_OFFICE)),
    );

    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap(({value}) => of$(value as ClientConfig)),
    );
    const enableConfirmNotificationsToChannel = config.pipe(
        switchMap((cfg) => of$(Boolean(cfg.EnableConfirmNotificationsToChannel === 'true'))),
    );
    const isTimezoneEnabled = config.pipe(
        switchMap((cfg) => of$(Boolean(cfg.ExperimentalTimezone === 'true'))),
    );
    const maxMessageLength = config.pipe(
        switchMap((cfg) => of$(parseInt(cfg.MaxPostSize || '0', 10) || MAX_MESSAGE_LENGTH_FALLBACK)),
    );

    const useChannelMentions = combineLatest([channel, currentUser]).pipe(
        switchMap(([c, u]) => {
            if (!c) {
                return of$(true);
            }

            return from$(hasPermissionForChannel(c, u, Permissions.USE_CHANNEL_MENTIONS, false));
        }),
    );

    // groups: MM-41882 const license = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(
    // groups: MM-41882     switchMap(({value}) => of$(value as ClientLicense)),
    // groups: MM-41882 );

    // groups: MM-41882 const useGroupMentions = combineLatest([channel, currentUser, license]).pipe(
    // groups: MM-41882     switchMap(([c, u, l]) => {
    // groups: MM-41882         if (!c || l?.IsLicensed !== 'true') {
    // groups: MM-41882             return of$(false);
    // groups: MM-41882         }
    // groups: MM-41882
    // groups: MM-41882         return from$(hasPermissionForChannel(c, u, Permissions.USE_GROUP_MENTIONS, true));
    // groups: MM-41882     }),
    // groups: MM-41882 );

    // groups: MM-41882 const groupsWithAllowReference = channel.pipe(switchMap(
    // groups: MM-41882     (c) => database.get<GroupModel>(GROUP).query(
    // groups: MM-41882         Q.experimentalJoinTables([GROUPS_TEAM, GROUPS_CHANNEL]),
    // groups: MM-41882         Q.or(Q.on(GROUPS_TEAM, 'team_id', c.teamId), Q.on(GROUPS_CHANNEL, 'channel_id', c.id)),
    // groups: MM-41882     ).observeWithColumns(['name'])),
    // groups: MM-41882 );

    const channelInfo = channel.pipe(switchMap((c) => c.info.observe()));
    const membersCount = channelInfo.pipe(
        switchMap((i: ChannelInfoModel) => of$(i.memberCount)),
    );

    const customEmojis = database.get<CustomEmojiModel>(CUSTOM_EMOJI).query().observe();

    return {
        currentUserId,
        enableConfirmNotificationsToChannel,
        isTimezoneEnabled,
        maxMessageLength,
        membersCount,
        userIsOutOfOffice,
        useChannelMentions,

        // groups: MM-41882 useGroupMentions,
        // groups: MM-41882 groupsWithAllowReference,
        customEmojis,
    };
});

export default withDatabase(enhanced(SendHandler));
