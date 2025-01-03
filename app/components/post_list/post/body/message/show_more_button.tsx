// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient, type LinearGradientProps} from 'expo-linear-gradient';
import React from 'react';
import {TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type ShowMoreButtonProps = {
    highlight: boolean;
    onPress: () => void;
    showMore: boolean;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        button: {
            flex: 1,
            flexDirection: 'row',
        },
        buttonContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRadius: 22,
            borderWidth: 1,
            height: 44,
            width: 44,
            paddingTop: 7,
        },
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            flexDirection: 'row',
            position: 'relative',
            top: 10,
            marginBottom: 10,
        },
        dividerLeft: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            flex: 1,
            height: 1,
            marginRight: 10,
        },
        dividerRight: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            flex: 1,
            height: 1,
            marginLeft: 10,
        },
        gradient: {
            flex: 1,
            height: 50,
            position: 'absolute',
            top: -50,
            width: '100%',
        },
        sign: {
            color: theme.linkColor,
        },
    };
});

const ShowMoreButton = ({highlight, onPress, showMore = true, theme}: ShowMoreButtonProps) => {
    const style = getStyleSheet(theme);

    let iconName = 'chevron-down';
    if (!showMore) {
        iconName = 'chevron-up';
    }

    let gradientColors: LinearGradientProps['colors'] = [
        changeOpacity(theme.centerChannelBg, 0),
        changeOpacity(theme.centerChannelBg, 0.75),
        theme.centerChannelBg,
    ];

    if (highlight) {
        gradientColors = [
            changeOpacity(theme.mentionHighlightBg, 0),
            changeOpacity(theme.mentionHighlightBg, 0.15),
            changeOpacity(theme.mentionHighlightBg, 0.5),
        ];
    }

    return (
        <View>
            {showMore &&
            <LinearGradient
                colors={gradientColors}
                locations={[0, 0.7, 1]}
                style={style.gradient}
            />
            }
            <View style={style.container}>
                <View style={style.dividerLeft}/>
                <TouchableOpacity
                    onPress={onPress}
                    style={style.buttonContainer}
                >
                    <View
                        style={style.button}
                        testID={`show_more.button.${iconName}`}
                    >
                        <CompassIcon
                            name={iconName}
                            size={28}
                            style={style.sign}
                        />
                    </View>
                </TouchableOpacity>
                <View style={style.dividerRight}/>
            </View>
        </View>
    );
};

export default ShowMoreButton;
