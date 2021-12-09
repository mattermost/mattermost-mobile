// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {gte, lt} from 'semver';

import {Client4} from '@client/rest';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getNewSidebarPreference} from '@mm-redux/selectors/entities/preferences';
import {GlobalState} from '@mm-redux/types/store';

export const shouldShowLegacySidebar = (state: GlobalState) => {
    const config = getConfig(state);
    const serverVersion = config.Version || Client4.getServerVersion();

    // No server version? Default to legacy.
    if (!serverVersion) {
        return true;
    }

    // Older servers default to Legacy unless experimental flag is set
    if (lt(serverVersion, '5.32.0')) {
        const experimentalSidebarPref = getNewSidebarPreference(state);

        if (experimentalSidebarPref) {
            return false;
        }
        return true;
    }

    // Newer servers only show legacy if legacy flag is set
    if (gte(serverVersion, '5.32.0') && config.EnableLegacySidebar === 'true') {
        return true;
    }

    // Default to showing categories
    return false;
};
