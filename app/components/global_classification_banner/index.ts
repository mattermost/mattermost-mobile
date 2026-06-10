// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {map} from 'rxjs/operators';

import {observeClassificationBannerState} from '@queries/servers/properties';

import GlobalClassificationBannerContainer, {GLOBAL_BANNER_PORTAL_HOST} from './global_classification_banner_container';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const state$ = observeClassificationBannerState(database);
    return {
        visible: state$.pipe(map((s) => s.visible)),
        levelName: state$.pipe(map((s) => s.levelName)),
        color: state$.pipe(map((s) => s.color)),
    };
});

export {GLOBAL_BANNER_PORTAL_HOST};

export default withDatabase(enhanced(GlobalClassificationBannerContainer));
