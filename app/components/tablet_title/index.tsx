// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, Text, View} from 'react-native';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    action?: string;
    onPress: () => void;
    title: string;
    testID: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    actionContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginRight: 20,
    },
    action: {
        color: theme.buttonBg,
        fontFamily: 'OpenSans-Semibold',
        fontSize: 16,
        lineHeight: 24,
    },
    container: {
        backgroundColor: theme.centerChannelBg,
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
        flexDirection: 'row',
        height: 34,
        width: '100%',
    },
    titleContainer: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        color: theme.centerChannelColor,
        fontFamily: 'OpenSans-Semibold',
        fontSize: 18,
        lineHeight: 24,
    },
}));

const TabletTitle = ({action, onPress, testID, title}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <>
            <View style={styles.container}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{title}</Text>
                </View>
                {Boolean(action) &&
                <View style={styles.actionContainer}>
                    <TouchableWithFeedback
                        onPress={onPress}
                        type={Platform.select({android: 'native', ios: 'opacity'})}
                        testID={testID}
                        underlayColor={changeOpacity(theme.centerChannelColor, 0.1)}
                    >
                        <Text style={styles.action}>{action}</Text>
                    </TouchableWithFeedback>
                </View>
                }
            </View>
        </>
    );
};

export default TabletTitle;
