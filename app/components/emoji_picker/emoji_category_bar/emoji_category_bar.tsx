// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View} from 'react-native';

import emojiStore from '@app/store/emoji_picker';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {ICONS} from '../constant';

import EmojiCategoryBarIcon from './icon';

import type {EmojiCategoryType} from '@app/store/emoji_picker/interface';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        justifyContent: 'space-between',
        backgroundColor: theme.centerChannelBg,
        height: 55,
        paddingHorizontal: 12,
        paddingTop: 11,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderTopWidth: 1,
        flexDirection: 'row',
    },
}));

type Props = {
    categories: EmojiCategoryType[];
    currentIndex: number;
    onSelect?: (index: number | undefined) => void;
}

const EmojiCategoryBar = ({categories, currentIndex, onSelect}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const scrollToIndex = useCallback((index: number) => {
        if (onSelect) {
            onSelect(index);
            return;
        }

        emojiStore.setCurrentCategoryIndex(index);
    }, []);

    if (!categories) {
        return null;
    }

    return (
        <View
            style={styles.container}
            testID='emoji_picker.category_bar'
        >
            {categories.map((icon, index) => (
                <EmojiCategoryBarIcon
                    currentIndex={currentIndex}
                    key={icon.key}
                    icon={ICONS[icon.key as keyof typeof ICONS]}
                    index={index}
                    scrollToIndex={scrollToIndex}
                    theme={theme}
                />
            ))}
        </View>
    );
};

export default EmojiCategoryBar;
