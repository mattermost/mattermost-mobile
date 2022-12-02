// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {distinctUntilChanged, switchMap, combineLatest, Observable, of as of$} from 'rxjs';

import {observeCallsConfig, observeCallsState} from '@calls/state';
import {observeConfigValue} from '@queries/servers/system';
import {isMinimumServerVersion} from '@utils/helpers';

import type {Database} from '@nozbe/watermelondb';

export type LimitRestrictedInfo = {
    limitRestricted: boolean;
    maxParticipants: number;
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

export const observeIsCallLimitRestricted = (serverUrl: string, channelId: string) => {
    const maxParticipants = observeCallsConfig(serverUrl).pipe(
        switchMap((c) => of$(c.MaxCallParticipants)),
        distinctUntilChanged(),
    );
    const callNumOfParticipants = observeCallsState(serverUrl).pipe(
        switchMap((cs) => of$(Object.keys(cs.calls[channelId]?.participants || {}).length)),
        distinctUntilChanged(),
    );
    return combineLatest([maxParticipants, callNumOfParticipants]).pipe(
        switchMap(([max, numParticipants]) => of$({
            limitRestricted: max !== 0 && numParticipants >= max,
            maxParticipants: max,
        })),
        distinctUntilChanged((prev, curr) =>
            prev.limitRestricted === curr.limitRestricted && prev.maxParticipants === curr.maxParticipants),
    ) as Observable<LimitRestrictedInfo>;
};
