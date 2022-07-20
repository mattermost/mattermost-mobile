// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {TextStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import Screens from '@constants/screens';
import {showModal} from '@screens/navigation';
import {logInfo} from '@utils/log';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    isTablet: boolean;
    style: TextStyle;
}

const Settings = ({isTablet, style}: Props) => {
    const intl = useIntl();

    const openSettings = useCallback(preventDoubleTap(() => {
        if (isTablet) {
            //todo: https://mattermost.atlassian.net/browse/MM-39711
            logInfo('Settings on tablets need to be figured out and implemented - @Avinash');
        }
        showModal(
            Screens.SETTINGS,
            intl.formatMessage({id: 'mobile.screen.settings', defaultMessage: 'Settings'}),
        );
    }), [isTablet]);

    return (
        <MenuItem
            iconName='settings-outline'
            labelComponent={
                <FormattedText
                    id='account.settings'
                    defaultMessage='Settings'
                    style={style}
                />
            }
            onPress={openSettings}
            separator={false}
            testID='account.settings.action'
        />
    );
};

export default Settings;
