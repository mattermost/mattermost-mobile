// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged, map} from 'rxjs/operators';

import {Permissions} from '@constants';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeTeammateNameDisplay, observeCurrentUser} from '@queries/servers/user';
import {isSystemAdmin} from '@utils/user';

import Invite from './invite';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const team = observeCurrentTeam(database);

    const currentUser = observeCurrentUser(database);

    const enableGuestAccounts = observeConfigBooleanValue(database, 'EnableGuestAccounts');

    const buildEnterpriseReady = observeConfigBooleanValue(database, 'BuildEnterpriseReady');

    const teamIsGroupConstrained = team.pipe(
        switchMap((t) => of$(t?.isGroupConstrained)),
    );

    const canAddGuestToTeam = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.INVITE_GUEST, false)),
    );

    return {
        teamId: team.pipe(
            switchMap((t) => of$(t?.id)),
        ),
        teamDisplayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
        ),
        teamLastIconUpdate: team.pipe(
            switchMap((t) => of$(t?.lastTeamIconUpdatedAt)),
        ),
        teamInviteId: team.pipe(
            switchMap((t) => of$(t?.inviteId)),
        ),
        teammateNameDisplay: observeTeammateNameDisplay(database),
        isOpenServer: observeConfigBooleanValue(database, 'EnableOpenServer'),
        canInviteUser: combineLatest([teamIsGroupConstrained, currentUser, team]).pipe(
            switchMap(([constraint, u, t]) => {
                if (constraint) {
                    return of$(false);
                }
                return observePermissionForTeam(database, t, u, Permissions.ADD_USER_TO_TEAM, false);
            }),
        ),
        canInviteGuest: combineLatest([teamIsGroupConstrained, enableGuestAccounts, buildEnterpriseReady, canAddGuestToTeam]).pipe(
            switchMap(([isGroupConstrained, guestAccounts, enterpriseReady, addGuestToTeam]) => (
                of$(!isGroupConstrained && guestAccounts && enterpriseReady, addGuestToTeam)
            )),
        ),
        canSendEmailInvitations: observeConfigBooleanValue(database, 'EnableEmailInvitations'),
        isAdmin: observeCurrentUser(database).pipe(
            map((user) => isSystemAdmin(user?.roles || '')),
            distinctUntilChanged(),
        ),
    };
});

export default withDatabase(enhanced(Invite));
