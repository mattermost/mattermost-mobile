// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity} from '@utils/theme';

type Props = {
    isFocused: boolean;
    theme: Theme;
}

const Search = ({isFocused, theme}: Props) => {
    return (
        <View>
            <CompassIcon
                size={28}
                name='magnify'
                color={isFocused ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.48)}
            />
        </View>
    );
};

export default Search;
