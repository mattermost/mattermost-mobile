// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {TextStyle} from 'react-native';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    isTablet: boolean;
    style: TextStyle;
    theme: Theme;
}

const YourProfile = ({isTablet, style, theme}: Props) => {
    const openProfile = useCallback(preventDoubleTap(() => {
        // TODO: Open Profile screen in either a screen or in line for tablets
    }), [isTablet]);

    return (
        <DrawerItem
            testID='account.your_profile.action'
            labelComponent={
                <FormattedText
                    id='account.your_profile'
                    defaultMessage='Your Profile'
                    style={style}
                />
            }
            iconName='account-outline'
            onPress={openProfile}
            separator={false}
            theme={theme}
        />
    );
};

export default YourProfile;
