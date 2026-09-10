// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Pressable, TouchableHighlight, View} from 'react-native';

import GlassSurface from '@components/chrome/glass_surface';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {isPlatformUiIos} from '@constants/platform_ui';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const PRESSED_STYLE = {opacity: 0.72};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        justifyContent: 'center',
        flex: 1,
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
        borderRadius: isPlatformUiIos() ? 22 : 8,
        padding: 8,
        paddingHorizontal: isPlatformUiIos() ? 16 : 8,
        marginVertical: isPlatformUiIos() ? 16 : 20,
        height: isPlatformUiIos() ? 44 : 40,
    },
    platformContainer: {
        borderRadius: 22,
        flex: 1,
        height: 44,
        justifyContent: 'center',
        marginVertical: 16,
    },
    platformSurface: {
        alignItems: 'center',
        borderRadius: 22,
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 16,
    },
    row: {flexDirection: 'row'},
    icon: {
        width: 24,
        fontSize: 24,
        color: changeOpacity(theme.sidebarText, 0.72),
    },
    input: {
        color: changeOpacity(theme.sidebarText, 0.72),
        marginLeft: 5,
        marginTop: 1,
        ...typography('Body', 200),
    },
}));

const SearchField = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const platformUi = isPlatformUiIos();

    const onPress = usePreventDoubleTap(useCallback(() => {
        navigateToScreen(Screens.FIND_CHANNELS, {theme});
    }, [theme]));

    const content = (
        <View style={styles.row}>
            <CompassIcon
                name='magnify'
                style={styles.icon}
            />
            <FormattedText
                defaultMessage='Find channels...'
                id='channel_list.find_channels'
                style={styles.input}
            />
        </View>
    );

    if (platformUi) {
        return (
            <Pressable
                onPress={onPress}
                style={({pressed}) => [styles.platformContainer, pressed && PRESSED_STYLE]}
                testID='channel_list_subheader.search_field.button'
            >
                <GlassSurface
                    backdropColor={theme.sidebarBg}
                    interactive={true}
                    style={styles.platformSurface}
                >
                    {content}
                </GlassSurface>
            </Pressable>
        );
    }

    return (
        <TouchableHighlight
            style={styles.container}
            onPress={onPress}
            underlayColor={changeOpacity(theme.sidebarText, 0.32)}
            testID='channel_list_subheader.search_field.button'
        >
            {content}
        </TouchableHighlight>
    );
};

export default SearchField;
