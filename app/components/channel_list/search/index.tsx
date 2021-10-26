// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {TextInput} from 'react-native-gesture-handler';

import {useTheme} from '@app/context/theme';
import {typography} from '@app/utils/typography';
import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
        borderRadius: 8,
        padding: 8,
        marginVertical: 20,
        height: 40,
        maxHeight: 40,
    },
    icon: {
        width: 24,
        fontSize: 24,
        color: changeOpacity(theme.sidebarText, 0.72),
    },
    input: {
        flex: 1,
        height: 40,
        color: theme.sidebarText,
        alignItems: 'center',
        alignContent: 'center',
    },
}));

const textStyles = StyleSheet.create([
    typography('Body', 200),
    {textAlignVertical: 'center'},
]);

const SearchField = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View
            style={styles.container}
        >
            <CompassIcon
                name='magnify'
                style={styles.icon}
            />
            <TextInput
                style={[textStyles, styles.input]}
                placeholder='Find Channels'
                placeholderTextColor={changeOpacity(theme.sidebarText, 0.72)}
            />
        </View>
    );
};

export default SearchField;
