// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

export const shouldShowTermsOfService = createSelector(
    (user) => user,
    (_, general) => general,
    (user, general) => {
        // Defaults to false if the user is not logged in or the setting doesn't exist
        const acceptedTermsId = user?.temsOfServiceId || '';
        const acceptedAt = user?.termsOfServiceCreateAt || 0;
        const license = general.license || JSON.parse(general.serverLicense);
        const config = general.config || JSON.parse(general.serverConfig);
        const featureEnabled = license.IsLicensed === 'true' && config.EnableCustomTermsOfService === 'true';
        const reacceptanceTime = config.CustomTermsOfServiceReAcceptancePeriod * 1000 * 60 * 60 * 24;
        const timeElapsed = new Date().getTime() - acceptedAt;

        return Boolean(user && featureEnabled && (config.CustomTermsOfServiceId !== acceptedTermsId || timeElapsed > reacceptanceTime));
    }
);
