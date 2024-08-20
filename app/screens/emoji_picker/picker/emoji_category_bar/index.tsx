// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Divider} from '@rneui/base';
import React, {useCallback} from 'react';
import {View, ScrollView} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import {useTheme} from '@context/theme';
import {selectEmojiCategoryBarSection, useEmojiCategoryBar} from '@hooks/emoji_category_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmojiCategoryBarIcon from './icon';

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
        alignItems: 'center',
    },
    keyboardControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
    },
    category: {
        flex: 1,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    scrollView: {
        flexDirection: 'row',
        overflow: 'scroll',
    },
}));

type Props = {
    onSelect?: (index: number | undefined) => void;
    focus?: () => void;
    deleteCharFromCurrentCursorPosition: () => void;
}

const EmojiCategoryBar = ({
    onSelect,
    focus,
    deleteCharFromCurrentCursorPosition,
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
        <View
            style={styles.container}
            testID='emoji_picker.category_bar'
        >
            {focus &&
            <>
                <View style={styles.keyboardControls}>
                    <CompassIcon
                        name={'emoticon-outline'}
                        size={20}
                        color={changeOpacity(theme.centerChannelColor, 0.56)}
                        onPress={() => focus()}
                    />
                    <Divider
                        orientation='vertical'
                        color={changeOpacity(theme.centerChannelColor, 0.08)}
                        width={1}
                        style={{marginHorizontal: 8}}
                    />
                </View><View style={styles.category}>
                    <ScrollView
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollView}
                    >
                        {iconCatergories}
                    </ScrollView>
                </View><View style={styles.keyboardControls}>
                    <Divider
                        orientation='vertical'
                        color={changeOpacity(theme.centerChannelColor, 0.08)}
                        width={1}
                        style={{marginHorizontal: 8}}
                    />
                    <CompassIcon
                        name={'emoticon-outline'}
                        size={20}
                        color={changeOpacity(theme.centerChannelColor, 0.56)}
                        onPress={() => deleteCharFromCurrentCursorPosition()}
                    />
                </View>
            </>}
            {
                !focus &&
                <View style={styles.category}>
                    {iconCatergories}
                </View>
            }
        </View>
    );
};

export default EmojiCategoryBar;
