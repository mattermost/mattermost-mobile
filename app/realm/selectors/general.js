// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

export const getConfig = createSelector(
    (general) => general,
    (general) => {
        let config = general[0]?.config;

        // fallback
        if (!config) {
            try {
                config = JSON.parse(general[0]?.serverConfig);
            } catch (e) {
                config = {};
            }
        }

        return config;
    },
);

export const getLicense = createSelector(
    (general) => general,
    (general) => {
        let license = general[0]?.license;

        // fallback
        if (!license) {
            try {
                license = JSON.parse(general[0]?.serverLicense);
            } catch (e) {
                license = {};
            }
        }

        return license;
    },
);

export const getCurrentTeamId = createSelector(
    (general) => general,
    (general) => {
        return general[0]?.currentTeamId;
    },
);

export const getCurrentChannelId = createSelector(
    (general) => general,
    (general) => {
        return general[0]?.currentChannelId;
    },
);

export const getCurrentUser = createSelector(
    (userResults) => userResults,
    (usersResults) => {
        return usersResults ? usersResults[0] : null;
    }
);
