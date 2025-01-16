// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    title: string;
    description: string;
    testID?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    description: {
        color: theme.centerChannelColor,
        flex: 2,
        ...typography('Body', 200),
    },
    title: {
        color: theme.centerChannelColor,
        flex: 1,
        marginRight: 20,
        height: '100%',
        alignItems: 'flex-start',
        ...typography('Body', 100, 'SemiBold'),
    },
}));

const UserProfileLabel = ({title, description, testID}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <Text
                style={styles.title}
                testID={`${testID}.title`}
                numberOfLines={1}
            >
                {title}
            </Text>
            <Text
                style={styles.description}
                testID={`${testID}.description`}
            >
                {description}
            </Text>
        </View>
    );
};

export default UserProfileLabel;
