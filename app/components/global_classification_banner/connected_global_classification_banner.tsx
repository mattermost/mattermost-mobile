// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';

import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {useClassificationBanner} from '@hooks/use_classification_banner';
import {getConfigValue} from '@queries/servers/system';
import {logWarning} from '@utils/log';

import GlobalClassificationBanner from './global_classification_banner';

const ConnectedGlobalClassificationBanner = () => {
    const serverUrl = useServerUrl();
    const [featureEnabled, setFeatureEnabled] = useState(false);
    const {visible, levelName, color} = useClassificationBanner(featureEnabled);

    useEffect(() => {
        const checkFeatureFlag = async () => {
            try {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const value = await getConfigValue(database, 'FeatureFlagClassificationMarkings');
                setFeatureEnabled(value === 'true');
            } catch (e) {
                logWarning('Failed to check ClassificationMarkings feature flag', e);
            }
        };

        checkFeatureFlag();
    }, [serverUrl]);

    if (!featureEnabled) {
        return null;
    }

    return (
        <GlobalClassificationBanner
            visible={visible}
            levelName={levelName}
            color={color}
        />
    );
};

export default React.memo(ConnectedGlobalClassificationBanner);
