// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    textContainer: {
        marginBottom: 32,
        maxWidth: 600,
        width: '100%',
        paddingHorizontal: 20,
    },
    title: {
        letterSpacing: -1,
        color: theme.centerChannelColor,
        marginVertical: 12,
        ...typography('Heading', 1000, 'SemiBold'),
    },
    description: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 200, 'Regular'),
    },
}));

const EditServerHeader = ({theme}: Props) => {
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.textContainer}>
            <FormattedText
                defaultMessage='Edit server name'
                id='edit_server.title'
                style={styles.title}
                testID='edit_server_header.title'
            />
            <FormattedText
                defaultMessage='Specify a display name for this server'
                id='edit_server.description'
                style={styles.description}
                testID='edit_server_header.description'
            />
        </View>
    );
};

export default EditServerHeader;
