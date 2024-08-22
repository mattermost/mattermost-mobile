// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Divider} from '@rneui/base';
import React, {useCallback} from 'react';
import {View, ScrollView} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import {useIsTablet} from '@app/hooks/device';
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
    categoryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    keyboardControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    category: {
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
    deleteCharFromCurrentCursorPosition?: () => void;
}

const EmojiCategoryBar = ({
    onSelect,
    focus,
    deleteCharFromCurrentCursorPosition,
}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
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
            {focus && deleteCharFromCurrentCursorPosition &&
            <View style={styles.categoryBar}>
                <View style={styles.keyboardControls}>
                    <CompassIcon
                        name={'keyboard-outline'}
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
                </View>
                <View style={{...styles.category, flex: isTablet ? 0 : 1}}>
                    {!isTablet &&
                        <ScrollView
                            horizontal={true}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.scrollView}
                        >
                            {iconCatergories}
                        </ScrollView>
                    }
                    {isTablet && iconCatergories}
                </View>
                <View style={styles.keyboardControls}>
                    <Divider
                        orientation='vertical'
                        color={changeOpacity(theme.centerChannelColor, 0.08)}
                        width={1}
                        style={{marginHorizontal: 8}}
                    />
                    <CompassIcon
                        name={'backspace-outline'}
                        size={20}
                        color={changeOpacity(theme.centerChannelColor, 0.56)}
                        onPress={() => deleteCharFromCurrentCursorPosition()}
                    />
                </View>
            </View>}
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
