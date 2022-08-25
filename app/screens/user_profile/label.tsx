// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    title: string;
    description: string;
    testID?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginVertical: 8,
    },
    description: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    title: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginBottom: 2,
        ...typography('Body', 50, 'SemiBold'),
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
