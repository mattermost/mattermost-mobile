// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TextStyle} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';

import {popToRoot, showSearchModal, dismissAllModals} from '@screens/navigation';

type HashtagProps = {
    hashtag: string;
    linkStyle: TextStyle;
};

const Hashtag = ({hashtag, linkStyle}: HashtagProps) => {
    const handlePress = async () => {
        // Close thread view, permalink view, etc
        await dismissAllModals();
        await popToRoot();

        showSearchModal('#' + hashtag);
    };

    return (
        <TouchableOpacity onPress={handlePress}>
            <Text style={linkStyle}>
                {`#${hashtag}`}
            </Text>
        </TouchableOpacity>
    );
};

export default Hashtag;
