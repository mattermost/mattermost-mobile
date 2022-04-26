// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest} from 'rxjs';

import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfig} from '@queries/servers/system';

import Opengraph from './opengraph';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(
    ['removeLinkPreview'],
    ({database, removeLinkPreview}: WithDatabaseArgs & {removeLinkPreview: boolean}) => {
        if (removeLinkPreview) {
            return {showLinkPreviews: of$(false)};
        }

        const config = observeConfig(database);
        const linkPreviewPreference = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.LINK_PREVIEW_DISPLAY).observe();
        const showLinkPreviews = combineLatest([config, linkPreviewPreference], (cfg, pref) => {
            const previewsEnabled = getPreferenceAsBool(pref, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.LINK_PREVIEW_DISPLAY, true);
            return of$(previewsEnabled && cfg?.EnableLinkPreviews === 'true');
        });

        return {showLinkPreviews};
    },
);

export default withDatabase(enhance(Opengraph));
