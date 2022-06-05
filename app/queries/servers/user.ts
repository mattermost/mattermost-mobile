// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';

import {queryPreferencesByCategoryAndName} from './preference';
import {observeConfig, observeCurrentUserId, observeLicense, getCurrentUserId, getConfig, getLicense} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type TeamMembershipModel from '@typings/database/models/servers/team_membership';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {CHANNEL_MEMBERSHIP, USER, TEAM_MEMBERSHIP}} = MM_TABLES;
export const getUserById = async (database: Database, userId: string) => {
    try {
        const userRecord = (await database.get<UserModel>(USER).find(userId));
        return userRecord;
    } catch {
        return undefined;
    }
};

export const observeUser = (database: Database, userId: string) => {
    return database.get<UserModel>(USER).query(Q.where('id', userId), Q.take(1)).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );
};

export const getCurrentUser = async (database: Database) => {
    const currentUserId = await getCurrentUserId(database);
    if (currentUserId) {
        return getUserById(database, currentUserId);
    }

    return undefined;
};

export const observeCurrentUser = (database: Database) => {
    return observeCurrentUserId(database).pipe(
        switchMap((id) => observeUser(database, id)),
    );
};

export const queryAllUsers = (database: Database) => {
    return database.get<UserModel>(USER).query();
};

export const queryUsersById = (database: Database, userIds: string[]) => {
    return database.get<UserModel>(USER).query(Q.where('id', Q.oneOf(userIds)));
};

export const queryUsersByUsername = (database: Database, usernames: string[]) => {
    return database.get<UserModel>(USER).query(Q.where('username', Q.oneOf(usernames)));
};

export async function prepareUsers(operator: ServerDataOperator, users: UserProfile[]): Promise<UserModel[]> {
    return operator.handleUsers({users, prepareRecordsOnly: true});
}

export const observeTeammateNameDisplay = (database: Database) => {
    const config = observeConfig(database);
    const license = observeLicense(database);
    const preferences = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).
        observeWithColumns(['value']);
    return combineLatest([config, license, preferences]).pipe(
        switchMap(
            ([cfg, lcs, prefs]) => of$(getTeammateNameDisplaySetting(prefs, cfg, lcs)),
        ),
    );
};

export async function getTeammateNameDisplay(database: Database) {
    const config = await getConfig(database);
    const license = await getLicense(database);
    const preferences = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).fetch();
    return getTeammateNameDisplaySetting(preferences, config, license);
}

export const queryUsersLike = (database: Database, likeUsername: string) => {
    return database.get<UserModel>(USER).query(
        Q.where('username', Q.like(
            `%${Q.sanitizeLikeString(likeUsername)}%`,
        )),
    );
};

export const queryUsersByIdsOrUsernames = (database: Database, ids: string[], usernames: string[]) => {
    return database.get<UserModel>(USER).query(
        Q.or(
            Q.where('id', Q.oneOf(ids)),
            Q.where('username', Q.oneOf(usernames)),
        ));
};

export const observeUserIsTeamAdmin = (database: Database, userId: string, teamId: string) => {
    const id = `${teamId}-${userId}`;
    return database.get<TeamMembershipModel>(TEAM_MEMBERSHIP).query(
        Q.where('id', Q.eq(id)),
    ).observe().pipe(
        switchMap((tm) => of$(tm.length ? tm[0].schemeAdmin : false)),
    );
};

export const observeUserIsChannelAdmin = (database: Database, userId: string, teamId: string) => {
    const id = `${teamId}-${userId}`;
    return database.get<ChannelMembershipModel>(CHANNEL_MEMBERSHIP).query(
        Q.where('id', Q.eq(id)),
    ).observe().pipe(
        switchMap((tm) => of$(tm.length ? tm[0].schemeAdmin : false)),
    );
};
