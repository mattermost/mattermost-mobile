// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {DeviceEventEmitter, type StyleProp, Text, type TextStyle} from 'react-native';

import {Navigation, Screens} from '@constants';
import {dismissAllModalsAndPopToRoot} from '@screens/navigation';

type HashtagProps = {
    hashtag: string;
    linkStyle: StyleProp<TextStyle>;
};

const Hashtag = ({hashtag, linkStyle}: HashtagProps) => {
    const handlePress = async () => {
        // Close thread view, permalink view, etc
        await dismissAllModalsAndPopToRoot();

        DeviceEventEmitter.emit(Navigation.NAVIGATE_TO_TAB, {
            screen: Screens.SEARCH,
            params: {
                searchTerm: `#${hashtag}`,
            },
        });
    };

    return (
        <Text
            onPress={handlePress}
            style={linkStyle}
        >
            {`#${hashtag}`}
        </Text>
    );
};

export default Hashtag;
