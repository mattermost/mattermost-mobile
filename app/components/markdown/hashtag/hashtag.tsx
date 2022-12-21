// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {DeviceEventEmitter, StyleProp, Text, TextStyle} from 'react-native';

import {Navigation, Screens} from '@constants';
import {popToRoot, dismissAllModals} from '@screens/navigation';

type HashtagProps = {
    inChannel: string;
    hashtag: string;
    linkStyle: StyleProp<TextStyle>;
};

const Hashtag = ({hashtag, inChannel, linkStyle}: HashtagProps) => {
    const handlePress = async () => {
        // Close thread view, permalink view, etc
        await dismissAllModals();
        await popToRoot();

        let searchTerm = hashtag;
        if (inChannel) {
            searchTerm = `in: ${inChannel} #${hashtag}`;
        }

        DeviceEventEmitter.emit(Navigation.NAVIGATE_TO_TAB, {
            screen: Screens.SEARCH,
            params: {
                searchTerm,
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
