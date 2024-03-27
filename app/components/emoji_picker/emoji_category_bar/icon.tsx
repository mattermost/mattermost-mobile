// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    currentIndex: number;
    icon: string;
    index: number;
    scrollToIndex: (index: number) => void;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    selectedContainer: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        borderRadius: 4,
    },
    selected: {
        color: theme.buttonBg,
    },
}));

const EmojiCategoryBarIcon = ({currentIndex, icon, index, scrollToIndex, theme}: Props) => {
    const style = getStyleSheet(theme);
    const onPress = useCallback(preventDoubleTap(() => scrollToIndex(index)), []);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[style.container, currentIndex === index ? style.selectedContainer : undefined]}
        >
            <CompassIcon
                name={icon}
                size={20}
                style={[style.icon, currentIndex === index ? style.selected : undefined]}
            />
        </TouchableOpacity>
    );
};

export default EmojiCategoryBarIcon;
