// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, TextStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import {Events, Screens} from '@constants';
import {ACCOUNT_OUTLINE_IMAGE} from '@constants/profile';
import {showModal} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    isTablet: boolean;
    style: TextStyle;
    theme: Theme;
}

const YourProfile = ({isTablet, style, theme}: Props) => {
    const intl = useIntl();
    const openProfile = useCallback(preventDoubleTap(() => {
        if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, Screens.EDIT_PROFILE);
        } else {
            showModal(
                Screens.EDIT_PROFILE,
                intl.formatMessage({id: 'mobile.screen.your_profile', defaultMessage: 'Your Profile'}),
            );
        }
    }), [isTablet, theme]);

    return (
        <MenuItem
            iconName={ACCOUNT_OUTLINE_IMAGE}
            labelComponent={
                <FormattedText
                    id='account.your_profile'
                    defaultMessage='Your Profile'
                    style={style}
                />
            }
            onPress={openProfile}
            separator={false}
            testID='account.your_profile.action'
        />
    );
};

export default YourProfile;
