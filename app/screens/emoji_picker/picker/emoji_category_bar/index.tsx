// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {selectEmojiCategoryBarSection, useEmojiCategoryBar} from '@hooks/emoji_category_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmojiCategoryBarIcon from './icon';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        justifyContent: 'space-between',
        backgroundColor: theme.centerChannelBg,
        height: 55,
        paddingHorizontal: 20,
        paddingTop: 11,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderTopWidth: 1,
        flexDirection: 'row',
    },
}));

export type SectionIconType = {
    key: string;
    icon: string;
}

type Props = {
    onSelect?: (index: number | undefined) => void;
}

const EmojiSectionBar = ({onSelect}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {currentIndex, icons} = useEmojiCategoryBar();

    const scrollToIndex = useCallback((index: number) => {
        if (onSelect) {
            onSelect(index);
            return;
        }

        selectEmojiCategoryBarSection(index);
    }, []);

    if (!icons) {
        return null;
    }

    return (
        <View
            style={styles.container}
            testID='emoji_picker.emoji_sections.section_bar'
        >
            {icons.map((icon, index) => (
                <EmojiCategoryBarIcon
                    currentIndex={currentIndex}
                    key={icon.key}
                    icon={icon.icon}
                    index={index}
                    scrollToIndex={scrollToIndex}
                    theme={theme}
                />
            ))}
        </View>
    );
};

export default EmojiSectionBar;
