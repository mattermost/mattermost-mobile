// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, TextStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';
import {Events, Screens} from '@constants';
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
            const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor);
            const closeButtonId = 'close-edit-profile';
            showModal(
                Screens.EDIT_PROFILE,
                intl.formatMessage({id: 'mobile.screen.your_profile', defaultMessage: 'Your Profile'}),
                {closeButtonId}, {
                    topBar: {
                        leftButtons: [{
                            id: closeButtonId,
                            icon: closeButton,
                            testID: closeButtonId,
                        }],
                    },
                });
        }
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
