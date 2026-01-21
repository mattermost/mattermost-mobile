// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {queryAllMyChannel} from '@queries/servers/channel';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';

import SearchHandler from './search_handler';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const sharedChannelsEnabled = observeConfigBooleanValue(database, 'ExperimentalSharedChannels');
    const canShowArchivedChannels = observeConfigBooleanValue(database, 'ExperimentalViewArchivedChannels');

    const currentTeam = observeCurrentTeam(database);
    const currentUser = observeCurrentUser(database);

    const joinedChannels = queryAllMyChannel(database).observe();

    const canCreatePublicChannels = combineLatest([currentUser, currentTeam]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PUBLIC_CHANNEL, true)),
    );

    const canCreatePrivateChannels = combineLatest([currentUser, currentTeam]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PRIVATE_CHANNEL, false)),
    );

    const canCreateChannels = combineLatest([canCreatePublicChannels, canCreatePrivateChannels]).pipe(
        switchMap(([open, priv]) => of$(open || priv)),
        distinctUntilChanged(),
    );

    return {
        canCreateChannels,
        currentTeamId: currentTeam.pipe(
            switchMap((t) => of$(t?.id)),
            distinctUntilChanged(),
        ),
        joinedChannels,
        sharedChannelsEnabled,
        canShowArchivedChannels,
    };
});

export default withDatabase(enhanced(SearchHandler));
