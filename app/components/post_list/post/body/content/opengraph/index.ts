// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getPreferenceAsBool} from '@helpers/api/preference';

import Opengraph from './opengraph';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';

const enhance = withObservables(
    ['removeLinkPreview'],
    ({database, removeLinkPreview}: WithDatabaseArgs & {removeLinkPreview: boolean}) => {
        if (removeLinkPreview) {
            return {showLinkPreviews: of$(false)};
        }

        const showLinkPreviews = database.get(MM_TABLES.SERVER.PREFERENCE).query(
            Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS),
            Q.where('name', Preferences.LINK_PREVIEW_DISPLAY),
        ).observe().pipe(
            switchMap(
                (preferences: PreferenceModel[]) => database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((config: SystemModel) => {
                        const cfg: ClientConfig = config.value;
                        const previewsEnabled = getPreferenceAsBool(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.LINK_PREVIEW_DISPLAY, true);
                        return of$(previewsEnabled && cfg.EnableLinkPreviews === 'true');
                    }),
                ),
            ),
        );

        return {showLinkPreviews};
    },
);

export default withDatabase(enhance(Opengraph));
