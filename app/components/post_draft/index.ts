// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {SYSTEM, USER, CHANNEL}} = MM_TABLES;

type OwnProps = {
    channelId?: string;
    channelIsArchived?: boolean;
}

const enhanced = withObservables([], (ownProps: WithDatabaseArgs & OwnProps) => {
    const database = ownProps.database;
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
    let channelIsArchived = of$(ownProps.channelIsArchived);
    if (!channelIsArchived) {
        channelIsArchived = channel.pipe(switchMap((c) => of$(c.deleteAt !== 0)));
    }

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
    };
});

export default withDatabase(enhanced(PostDraft));
