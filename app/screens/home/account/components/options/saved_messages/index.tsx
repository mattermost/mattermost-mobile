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

const SavedMessages = ({isTablet, style, theme}: Props) => {
    const openSavedMessages = useCallback(preventDoubleTap(() => {
        // TODO: Open Saved messages screen in either a screen or in line for tablets
    }), [isTablet]);

    return (
        <DrawerItem
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
