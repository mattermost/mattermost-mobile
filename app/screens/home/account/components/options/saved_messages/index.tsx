// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, TextStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import {Events, Screens} from '@constants';
import {showModal} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    isTablet: boolean;
    style: TextStyle;
    theme: Theme;
}

const SavedMessages = ({isTablet, style, theme}: Props) => {
    const intl = useIntl();
    const openSavedMessages = useCallback(preventDoubleTap(() => {
        if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, Screens.SAVED_POSTS);
        } else {
            const closeButtonId = 'close-saved-posts';
            const icon = CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor);
            const options = {
                topBar: {
                    leftButtons: [{
                        id: closeButtonId,
                        testID: closeButtonId,
                        icon,
                    }],
                },
            };
            showModal(
                Screens.SAVED_POSTS,
                intl.formatMessage({id: 'mobile.screen.saved_posts', defaultMessage: 'Saved Messages'}),
                {closeButtonId},
                options,
            );
        }
    }), [isTablet]);

    return (
        <MenuItem
            testID='account.saved_messages.action'
            labelComponent={
                <FormattedText
                    id='account.saved_messages'
                    defaultMessage='Saved Messages'
                    style={style}
                />
            }
            iconName='bookmark-outline'
            onPress={openSavedMessages}
            separator={false}
            theme={theme}
        />
    );
};

export default SavedMessages;
