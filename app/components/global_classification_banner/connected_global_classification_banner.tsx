// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {useServerUrl} from '@context/server';
import {useClassificationBannerState} from '@hooks/use_classification_banner';

import GlobalClassificationBanner from './global_classification_banner';

const ConnectedGlobalClassificationBanner = () => {
    const serverUrl = useServerUrl();
    const {visible, levelName, color} = useClassificationBannerState(serverUrl);

    return (
        <GlobalClassificationBanner
            visible={visible}
            levelName={levelName}
            color={color}
        />
    );
};

export default React.memo(ConnectedGlobalClassificationBanner);
