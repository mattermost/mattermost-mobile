// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applicationId} from 'expo-application';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {TouchableHighlight, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const isEncmaApp = applicationId === 'com.encma.hxmain';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        justifyContent: 'flex-start',
        flex: 1,
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
        borderRadius: 8,
        padding: 8,
        marginVertical: 20,
        height: 40,
    },
    encmaContainer: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.1),
        borderColor: changeOpacity(theme.sidebarText, 0.08),
        borderRadius: 14,
        borderWidth: 1,
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
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const accessibilityProps = isEncmaApp ? {
        accessibilityLabel: intl.formatMessage({id: 'channel_list.find_channels', defaultMessage: 'Find channels...'}),
        accessibilityRole: 'button' as const,
    } : {};

    const onPress = usePreventDoubleTap(useCallback(() => {
        navigateToScreen(Screens.FIND_CHANNELS, {theme});
    }, [theme]));

    return (
        <TouchableHighlight
            {...accessibilityProps}
            style={isEncmaApp ? [styles.container, styles.encmaContainer] : styles.container}
            onPress={onPress}
            underlayColor={changeOpacity(theme.sidebarText, 0.32)}
            testID='channel_list_subheader.search_field.button'
        >
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
        </TouchableHighlight>
    );
};

export default SearchField;
