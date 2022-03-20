// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@app/constants/database';
import {General, Preferences} from '@constants';
import {WithDatabaseArgs} from '@typings/database/database';

import CategoryBody from './category_body';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type PreferenceModel from '@typings/database/models/servers/preference';

type ChannelData = Pick<ChannelModel, 'id' | 'displayName'> & {
    isMuted: boolean;
};

const {SERVER: {MY_CHANNEL_SETTINGS, PREFERENCE}} = MM_TABLES;

const sortAlpha = (locale: string, a: ChannelData, b: ChannelData) => {
    if (a.isMuted && !b.isMuted) {
        return 1;
    } else if (!a.isMuted && b.isMuted) {
        return -1;
    }

    return a.displayName.localeCompare(b.displayName, locale, {numeric: true});
};

const buildAlphaData = (channels: ChannelModel[], settings: MyChannelSettingsModel[], locale: string) => {
    const combined = channels.map((c) => {
        const s = settings.find((setting) => setting.id === c.id);
        return {
            id: c.id,
            displayName: c.displayName,
            isMuted: s?.notifyProps?.mark_unread === General.MENTION,
        };
    });

    combined.sort(sortAlpha.bind(null, locale));

    return of$(combined.map((c) => c.id));
};

const querySettings = (database: Database, channels: ChannelModel[]) => {
    const ids = channels.map((c) => c.id);
    return database.get<MyChannelSettingsModel>(MY_CHANNEL_SETTINGS).
        query(
            Q.where('id', Q.oneOf(ids)),
        ).observeWithColumns(['notify_props']);
};

const getSortedIds = (database: Database, category: CategoryModel, locale: string) => {
    switch (category.sorting) {
        case 'alpha': {
            const channels = category.channels.observeWithColumns(['display_name']);
            const settings = channels.pipe(
                switchMap((cs) => querySettings(database, cs)),
            );
            return combineLatest([channels, settings]).pipe(
                switchMap(([cs, st]) => buildAlphaData(cs, st, locale)),
            );
        }
        case 'manual': {
            return category.categoryChannelsBySortOrder.observeWithColumns(['sort_order']).pipe(
                // eslint-disable-next-line max-nested-callbacks
                switchMap((cc) => of$(cc.map((c) => c.channelId))),
            );
        }
        default:
            return category.myChannels.observeWithColumns(['last_post_at']).pipe(
                // eslint-disable-next-line max-nested-callbacks
                switchMap((mc) => of$(mc.map((m) => m.id))),
            );
    }
};

const enhance = withObservables(['category'], ({category, locale, database}: {category: CategoryModel; locale: string} & WithDatabaseArgs) => {
    const observedCategory = category.observe();
    const sortedIds = observedCategory.pipe(
        switchMap((c) => getSortedIds(database, c, locale)),
    );

    let limit = of$(0);
    if (category.type === 'direct_messages') {
        limit = database.get<PreferenceModel>(PREFERENCE).
            query(
                Q.where('category', Preferences.CATEGORY_SIDEBAR_SETTINGS),
                Q.where('name', 'limit_visible_dms_gms'),
            ).observe().pipe(
                switchMap(
                    (val) => {
                        if (val[0]) {
                            return of$(parseInt(val[0].value, 10));
                        }

                        return of$(0);
                    },
                ),
            );
    }

    return {
        limit,
        sortedIds,
        category: observedCategory,
    };
});

export default withDatabase(enhance(CategoryBody));
