// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// SharedDataContext subscribes once to slow-changing preferences and broadcasts
// them to every category row, avoiding N identical per-category subscriptions.

import {withDatabase} from '@nozbe/watermelondb/react';
import React, {createContext, useContext, useEffect, useState} from 'react';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getSidebarPreferenceAsBool} from '@helpers/api/preference';
import {observeAllMyChannelNotifyProps} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName, querySidebarPreferences} from '@queries/servers/preference';
import {observeCurrentChannelId, observeLastUnreadChannelId} from '@queries/servers/system';
import {observeDeactivatedUsers} from '@queries/servers/user';

import type {SharedData} from './category/category';
import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const SharedDataContext = createContext<SharedData | undefined>(undefined);

export const useSharedData = (): SharedData | undefined => useContext(SharedDataContext);

type Props = WithDatabaseArgs & {
    isTablet: boolean;
    children: React.ReactNode;
};

const SharedDataProvider = ({database, isTablet, children}: Props) => {
    const [sharedData, setSharedData] = useState<SharedData | undefined>(undefined);

    useEffect(() => {
        const notifyProps = observeAllMyChannelNotifyProps(database);

        const hiddenDm = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW, undefined, 'false').observeWithColumns(['value']);
        const hiddenGm = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.GROUP_CHANNEL_SHOW, undefined, 'false').observeWithColumns(['value']);
        const manuallyClosedPrefs = hiddenDm.pipe(
            switchMap((dms) => combineLatest([of$(dms), hiddenGm])),
            map(([dms, gms]) => dms.concat(gms)),
        );

        const approxView = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.CHANNEL_APPROXIMATE_VIEW_TIME, undefined).observeWithColumns(['value']);
        const openTime = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.CHANNEL_OPEN_TIME, undefined).observeWithColumns(['value']);
        const autoclosePrefs = approxView.pipe(
            switchMap((v) => combineLatest([of$(v), openTime])),
            map(([a, b]) => a.concat(b)),
        );

        const dmsLimit = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_LIMIT_DMS).
            observeWithColumns(['value']).pipe(
                switchMap((val) => of$(val[0] ? parseInt(val[0].value, 10) : Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT)),
            );

        const unreadsOnTop = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observeWithColumns(['value']).pipe(
                switchMap((prefs: PreferenceModel[]) => of$(getSidebarPreferenceAsBool(prefs, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS))),
            );

        const deactivatedUsers = observeDeactivatedUsers(database);
        const currentChannelId = isTablet ? observeCurrentChannelId(database) : of$('');
        const lastUnreadId = isTablet ? observeLastUnreadChannelId(database) : of$(undefined as string | undefined);

        const sub = combineLatest([notifyProps, manuallyClosedPrefs, autoclosePrefs, deactivatedUsers, dmsLimit, currentChannelId, lastUnreadId, unreadsOnTop]).pipe(
            map(([nProps, manuallyClosedP, autocloseP, deactivated, limit, currChannelId, lastUnread, unreads]) => ({
                notifyProps: nProps,
                manuallyClosedPrefs: manuallyClosedP,
                autoclosePrefs: autocloseP,
                deactivatedUsers: deactivated,
                dmsLimit: limit,
                currentChannelId: currChannelId,
                lastUnreadId: lastUnread,
                unreadsOnTop: unreads,
            })),
        ).subscribe(setSharedData);

        return () => sub.unsubscribe();
    }, [database, isTablet]);

    return (
        <SharedDataContext.Provider value={sharedData}>
            {children}
        </SharedDataContext.Provider>
    );
};

export default withDatabase(SharedDataProvider);
