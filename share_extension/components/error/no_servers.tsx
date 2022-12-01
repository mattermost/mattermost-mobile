// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    theme: Theme;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 32,
    },
    title: {
        color: theme.centerChannelColor,
        marginBottom: 8,
        ...typography('Heading', 400),
    },
    description: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        textAlign: 'center',
        ...typography('Body', 200),
    },
}));

const NoServers = ({theme}: Props) => {
    const styles = getStyles(theme);

    return (
        <View style={styles.container}>
            <FormattedText
                id='extension.no_servers.title'
                defaultMessage='Not connected to any servers'
                style={styles.title}
            />
            <FormattedText
                id='extension.no_servers.description'
                defaultMessage="To share content, you'll need to be logged in to a Mattermost server."
                style={styles.description}
            />
        </View>
    );
};

export default NoServers;
