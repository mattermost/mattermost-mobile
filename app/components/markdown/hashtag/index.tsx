// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, Text, TextStyle} from 'react-native';

import {popToRoot, dismissAllModals} from '@screens/navigation';

type HashtagProps = {
    hashtag: string;
    linkStyle: StyleProp<TextStyle>;
};

const Hashtag = ({hashtag, linkStyle}: HashtagProps) => {
    const handlePress = async () => {
        // Close thread view, permalink view, etc
        await dismissAllModals();
        await popToRoot();

        // showSearchModal('#' + hashtag);
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
