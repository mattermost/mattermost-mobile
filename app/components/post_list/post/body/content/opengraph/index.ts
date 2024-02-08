// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, combineLatest} from 'rxjs';

import {Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';

import Opengraph from './opengraph';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(
    ['removeLinkPreview'],
    ({database, removeLinkPreview}: WithDatabaseArgs & {removeLinkPreview: boolean}) => {
        if (removeLinkPreview) {
            return {showLinkPreviews: of$(false)};
        }

        const linkPreviewsConfig = observeConfigBooleanValue(database, 'EnableLinkPreviews');
        const linkPreviewPreference = queryDisplayNamePreferences(database, Preferences.LINK_PREVIEW_DISPLAY).
            observeWithColumns(['value']);
        const showLinkPreviews = combineLatest([linkPreviewsConfig, linkPreviewPreference], (cfg, pref) => {
            const previewsEnabled = getDisplayNamePreferenceAsBool(pref, Preferences.LINK_PREVIEW_DISPLAY, true);
            return of$(previewsEnabled && cfg);
        });

        return {showLinkPreviews};
    },
);

export default withDatabase(enhance(Opengraph));
