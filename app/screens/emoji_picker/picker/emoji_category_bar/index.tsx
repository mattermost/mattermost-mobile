// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {selectEmojiCategoryBarSection, useEmojiCategoryBar} from '@hooks/emoji_category_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmojiPickerCategoryBar from './emoji_picker_category_bar';
import EmojiCategoryBarIcon from './icon';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    catergoryContainer: {
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
    onSelect?: (index: number | undefined) => void;
    handleToggleEmojiPicker?: () => void;
    deleteCharFromCurrentCursorPosition?: () => void;
    isEmojiPicker?: boolean;
}

const EmojiCategoryBar = ({
    onSelect,
    handleToggleEmojiPicker,
    deleteCharFromCurrentCursorPosition,
    isEmojiPicker = false,
}: Props) => {
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

    const iconCatergories = icons.map((icon, index) => (
        <EmojiCategoryBarIcon
            currentIndex={currentIndex}
            key={icon.key}
            icon={icon.icon}
            index={index}
            scrollToIndex={scrollToIndex}
            theme={theme}
        />
    ));

    return (
        <>
            <EmojiPickerCategoryBar
                isEmojiPicker={isEmojiPicker}
                handleToggleEmojiPicker={handleToggleEmojiPicker}
                deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
                iconCatergories={iconCatergories}
            />
            {
                !isEmojiPicker &&
                <View style={styles.catergoryContainer}>
                    {iconCatergories}
                </View>
            }
        </>
    );
};

export default EmojiCategoryBar;
