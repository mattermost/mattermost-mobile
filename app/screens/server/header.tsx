// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useIsTablet} from '@hooks/device';
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
    welcome: {
        marginTop: 12,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Heading', 400, 'SemiBold'),
    },
    connect: {
        width: 270,
        letterSpacing: -1,
        color: theme.mentionColor,
        marginVertical: 12,
        ...typography('Heading', 1000, 'SemiBold'),
    },
    connectTablet: {
        width: undefined,
    },
    description: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 100, 'Regular'),
    },
}));

const ServerHeader = ({theme}: Props) => {
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.textContainer}>
            <FormattedText
                defaultMessage={'Welcome'}
                id={'mobile.components.select_server_view.msg_welcome'}
                testID={'mobile.components.select_server_view.msg_welcome'}
                style={styles.welcome}
            />
            <FormattedText
                defaultMessage={'Let’s Connect to a Server'}
                id={'mobile.components.select_server_view.msg_connect'}
                style={[styles.connect, isTablet ? styles.connectTablet : undefined]}
                testID={'mobile.components.select_server_view.msg_connect'}
            />
            <FormattedText
                defaultMessage={"A Server is your team's communication hub which is accessed through a unique URL"}
                id={'mobile.components.select_server_view.msg_description'}
                style={styles.description}
                testID={'mobile.components.select_server_view.msg_description'}
            />
        </View>
    );
};

export default ServerHeader;
