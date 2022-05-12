// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 8,
        paddingTop: 12,
        paddingLeft: 2,
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.centerChannelBg,
    },
    heading: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        textTransform: 'uppercase',
        ...typography('Heading', 75, 'SemiBold'),
    },
}));

type Props = {
    sectionName: string;
}

const FindChannelsHeader = ({sectionName}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <Text
                style={styles.heading}
                testID={`find_channels.header.${sectionName}`}
            >
                {sectionName.toUpperCase()}
            </Text>
        </View>
    );
};

export default FindChannelsHeader;
