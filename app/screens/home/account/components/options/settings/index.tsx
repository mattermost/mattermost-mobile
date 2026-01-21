// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';
import Screens from '@constants/screens';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToScreen} from '@screens/navigation';

const Settings = () => {
    const intl = useIntl();

    const openSettings = usePreventDoubleTap(useCallback(() => {
        navigateToScreen(Screens.SETTINGS);
    }, []));

    return (
        <OptionItem
            action={openSettings}
            icon='settings-outline'
            label={intl.formatMessage({id: 'account.settings', defaultMessage: 'Settings'})}
            testID='account.settings.option'
            type='default'
        />
    );
};

export default Settings;
