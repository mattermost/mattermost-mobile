// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {TextStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    isTablet: boolean;
    style: TextStyle;
    theme: Theme;
}

const Settings = ({isTablet, style, theme}: Props) => {
    const openSettings = useCallback(preventDoubleTap(() => {
        // TODO: Open Saved messages screen in either a screen or in line for tablets
    }), [isTablet]);

    return (
        <MenuItem
            testID='account.settings.action'
            labelComponent={
                <FormattedText
                    id='account.settings'
                    defaultMessage='Settings'
                    style={style}
                />
            }
            iconName='settings-outline'
            onPress={openSettings}
            separator={false}
            theme={theme}
        />
    );
};

export default Settings;
