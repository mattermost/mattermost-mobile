// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {distinctUntilChanged, switchMap, combineLatest, Observable, of as of$} from 'rxjs';

import {observeCallsConfig, observeCallsState, observeCurrentCall} from '@calls/state';
import {fillUserModels, userIds} from '@calls/utils';
import {License} from '@constants';
import DatabaseManager from '@database/manager';
import {observeConfigValue, observeLicense} from '@queries/servers/system';
import {queryUsersById} from '@queries/servers/user';
import UserModel from '@typings/database/models/servers/user';
import {isMinimumServerVersion} from '@utils/helpers';

import type {CallSession} from '@calls/types/calls';
import type {Database} from '@nozbe/watermelondb';

export type LimitRestrictedInfo = {
    limitRestricted: boolean;
    maxParticipants: number;
    isCloudStarter: boolean;
}

export const observeIsCallsEnabledInChannel = (database: Database, serverUrl: string, channelId: Observable<string>) => {
    const callsDefaultEnabled = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.DefaultEnabled)),
        distinctUntilChanged(),
    );
    const callsStateEnabledDict = observeCallsState(serverUrl).pipe(
        switchMap((state) => of$(state.enabled)),
        distinctUntilChanged(), // Did the enabled object ref change? If so, a channel's enabled state has changed.
    );
    const callsGAServer = observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 7, 6))),
    );
    return combineLatest([channelId, callsStateEnabledDict, callsDefaultEnabled, callsGAServer]).pipe(
        switchMap(([id, enabled, defaultEnabled, gaServer]) => {
            const explicitlyEnabled = enabled.hasOwnProperty(id as string) && enabled[id];
            const explicitlyDisabled = enabled.hasOwnProperty(id as string) && !enabled[id];
            return of$(explicitlyEnabled || (!explicitlyDisabled && defaultEnabled) || (!explicitlyDisabled && gaServer));
        }),
        distinctUntilChanged(),
    ) as Observable<boolean>;
};

export const observeIsCallLimitRestricted = (database: Database, serverUrl: string, channelId: string) => {
    const maxParticipants = observeCallsConfig(serverUrl).pipe(
        switchMap((c) => of$(c.MaxCallParticipants)),
        distinctUntilChanged(),
    );
    const callNumOfParticipants = observeCallsState(serverUrl).pipe(
        switchMap((cs) => of$(Object.keys(cs.calls[channelId]?.sessions || {}).length)),
        distinctUntilChanged(),
    );
    const isCloud = observeLicense(database).pipe(
        switchMap((l) => of$(l?.Cloud === 'true')),
        distinctUntilChanged(),
    );
    const skuShortName = observeCallsConfig(serverUrl).pipe(
        switchMap((c) => of$(c.sku_short_name)),
        distinctUntilChanged(),
    );
    return combineLatest([maxParticipants, callNumOfParticipants, isCloud, skuShortName]).pipe(
        switchMap(([max, numParticipants, cloud, sku]) => of$({
            limitRestricted: max !== 0 && numParticipants >= max,
            maxParticipants: max,
            isCloudStarter: cloud && sku === License.SKU_SHORT_NAME.Starter,
        })),
        distinctUntilChanged((prev, curr) =>
            prev.limitRestricted === curr.limitRestricted && prev.maxParticipants === curr.maxParticipants && prev.isCloudStarter === curr.isCloudStarter),
    ) as Observable<LimitRestrictedInfo>;
};

export const observeCurrentSessionsDict = () => {
    const currentCall = observeCurrentCall();
    const database = currentCall.pipe(
        switchMap((call) => of$(call ? call.serverUrl : '')),
        distinctUntilChanged(),
        switchMap((url) => of$(DatabaseManager.serverDatabases[url]?.database)),
    );

    return combineLatest([database, currentCall]).pipe(
        switchMap(([db, call]) => (db && call ? queryUsersById(db, userIds(Object.values(call.sessions))).observeWithColumns(['nickname', 'username', 'first_name', 'last_name', 'last_picture_update']) : of$([])).pipe(

            // We now have a UserModel[] one for each userId, but we need the session dictionary with user models
            // eslint-disable-next-line max-nested-callbacks
            switchMap((ps: UserModel[]) => of$(fillUserModels(call?.sessions || {}, ps))),
        )),
    ) as Observable<Dictionary<CallSession>>;
};
