// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {distinctUntilChanged, switchMap, combineLatest, Observable, of as of$} from 'rxjs';

import {observeCallsConfig, observeCallsState} from '@calls/state';
import {General, License} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observeLicense} from '@queries/servers/system';

export const observeIsCallsFeatureRestricted = (database: Database, serverUrl: string, channelId: string) => {
    const isCloud = observeLicense(database).pipe(
        switchMap((l) => of$(l?.Cloud === 'true')),
        distinctUntilChanged(),
    );
    const skuShortName = observeCallsConfig(serverUrl).pipe(
        switchMap((c) => of$(c.sku_short_name)),
        distinctUntilChanged(),
    );
    const isDMChannel = observeChannel(database, channelId).pipe(
        switchMap((c) => of$(c?.type === General.DM_CHANNEL)),
        distinctUntilChanged(),
    );
    return combineLatest([isCloud, skuShortName, isDMChannel]).pipe(
        switchMap(([cloud, sku, dm]) => of$(cloud && sku === License.SKU_SHORT_NAME.Starter && !dm)), // are you restricted from making a call because of your subscription?
        distinctUntilChanged(),
    ) as Observable<boolean>;
};

export type LimitRestrictedInfo = {
    limitRestricted: boolean;
    maxParticipants: number;
}

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
