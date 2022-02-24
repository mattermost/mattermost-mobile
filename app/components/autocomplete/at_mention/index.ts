// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, from as from$, combineLatest, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {hasPermissionForChannel} from '@utils/role';

import AtMention from './at_mention';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type GroupModel from '@typings/database/models/servers/group';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {SYSTEM, GROUP, USER, CHANNEL}} = MM_TABLES;

const emptyList: GroupModel[] = [];
type OwnProps = {channelId?: string}
const enhanced = withObservables([], ({database, channelId}: WithDatabaseArgs & OwnProps) => {
    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => of$(value)),
    ).pipe(
        switchMap((id) => database.get<UserModel>(USER).findAndObserve(id)),
    );

    const hasLicense = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(
        switchMap(({value}) => of$(value?.IsLicensed === 'true')),
    );

    let useChannelMentions: Observable<boolean>;
    let groups: Observable<GroupModel[]>;
    if (channelId) {
        const currentChannel = database.get<ChannelModel>(CHANNEL).findAndObserve(channelId);
        useChannelMentions = combineLatest([currentUser, currentChannel]).pipe(switchMap(([u, c]) => from$(hasPermissionForChannel(c, u, Permissions.USE_CHANNEL_MENTIONS, false))));
        const useGroupMentions = combineLatest([currentUser, currentChannel]).pipe(
            switchMap(([u, c]) => from$(hasPermissionForChannel(c, u, Permissions.USE_GROUP_MENTIONS, false))),
        );
        groups = combineLatest([hasLicense, useGroupMentions]).pipe(
            switchMap(([lcs, ugm]) => (lcs && ugm ? database.get<GroupModel>(GROUP).query().observe() : of$(emptyList))),
        );
    } else {
        useChannelMentions = of$(false);
        groups = of$(emptyList);
    }

    return {
        useChannelMentions,
        groups,
    };
});

export default withDatabase(enhanced(AtMention));
