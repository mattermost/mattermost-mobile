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
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        zIndex: 10,
        borderRadius: 4,
        overflow: 'hidden',
    },
    icon: {
        fontSize: 18,
        color: changeOpacity(theme.centerChannelColor, 0.4),
        padding: 8,
    },
    selected: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        color: theme.buttonBg,
    },
}));

const SectionIcon = ({currentIndex, icon, index, scrollToIndex, theme}: Props) => {
    const style = getStyleSheet(theme);
    const onPress = useCallback(preventDoubleTap(() => scrollToIndex(index)), []);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={style.container}
        >
            <CompassIcon
                name={icon}
                style={[style.icon, currentIndex === index ? style.selected : undefined]}
            />
        </TouchableOpacity>
    );
};

export default SectionIcon;
