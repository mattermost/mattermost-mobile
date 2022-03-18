// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$, from as from$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {hasPermissionForChannel} from '@utils/role';
import {isSystemAdmin, getUserIdFromChannelName} from '@utils/user';

import PostDraft from './post_draft';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {DRAFT, SYSTEM, USER, CHANNEL}} = MM_TABLES;

type OwnProps = {
    channelId: string;
    channelIsArchived?: boolean;
    rootId?: string;
}

const enhanced = withObservables([], (ownProps: WithDatabaseArgs & OwnProps) => {
    const {database, rootId = ''} = ownProps;
    const draft = database.get<DraftModel>(DRAFT).query(
        Q.where('channel_id', ownProps.channelId),
        Q.where('root_id', rootId),
    ).observeWithColumns(['message', 'files']).pipe(switchMap((v) => of$(v[0])));

    const files = draft.pipe(switchMap((d) => of$(d?.files)));
    const message = draft.pipe(switchMap((d) => of$(d?.message)));

    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => database.get<UserModel>(USER).findAndObserve(value)),
    );

    let channelId = of$(ownProps.channelId);
    if (!ownProps.channelId) {
        channelId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID).pipe(
            switchMap((t) => of$(t.value)),
        );
    }

    const channel = channelId.pipe(
        switchMap((id) => database.get<ChannelModel>(CHANNEL).findAndObserve(id!)),
    );

    const canPost = combineLatest([channel, currentUser]).pipe(switchMap(([c, u]) => from$(hasPermissionForChannel(c, u, Permissions.CREATE_POST, false))));
    const channelIsArchived = channel.pipe(switchMap((c) => (ownProps.channelIsArchived ? of$(true) : of$(c.deleteAt !== 0))));

    const experimentalTownSquareIsReadOnly = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap(({value}: {value: ClientConfig}) => of$(value.ExperimentalTownSquareIsReadOnly === 'true')),
    );
    const channelIsReadOnly = combineLatest([currentUser, channel, experimentalTownSquareIsReadOnly]).pipe(
        switchMap(([u, c, readOnly]) => of$(c?.name === General.DEFAULT_CHANNEL && !isSystemAdmin(u.roles) && readOnly)),
    );

    const deactivatedChannel = combineLatest([currentUser, channel]).pipe(
        switchMap(([u, c]) => {
            if (c.type !== General.DM_CHANNEL) {
                return of$(false);
            }
            const teammateId = getUserIdFromChannelName(u.id, c.name);
            if (teammateId) {
                return database.get<UserModel>(USER).findAndObserve(teammateId).pipe(
                    switchMap((u2) => of$(Boolean(u2.deleteAt))), // eslint-disable-line max-nested-callbacks
                );
            }
            return of$(true);
        }),
    );

    return {
        canPost,
        channelIsArchived,
        channelIsReadOnly,
        deactivatedChannel,
        files,
        message,
    };
});

export default withDatabase(enhanced(PostDraft));
