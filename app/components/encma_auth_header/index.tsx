// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applicationId} from 'expo-application';
import React from 'react';
import {Image, Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const encmaLogo = require('@assets/images/encma-icon.png');

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 16,
        marginBottom: 28,
        width: '100%',
    },
    logo: {
        borderRadius: 16,
        height: 56,
        width: 56,
    },
    name: {
        color: theme.centerChannelColor,
        letterSpacing: 2.5,
        ...typography('Heading', 700, 'SemiBold'),
    },
    tagline: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginTop: 2,
        ...typography('Body', 100, 'Regular'),
    },
}));

type Props = {
    theme: Theme;
};

const EncmaAuthHeader = ({theme}: Props) => {
    if (applicationId !== 'com.encma.hxmain') {
        return null;
    }

    const styles = getStyleSheet(theme);

    return (
        <View
            style={styles.container}
            testID='encma_auth_header.container'
        >
            <Image
                accessible={false}
                source={encmaLogo}
                style={styles.logo}
                testID='encma_auth_header.logo'
            />
            <View>
                <Text
                    style={styles.name}
                    testID='encma_auth_header.name'
                >
                    {'ENCMA'}
                </Text>
                <FormattedText
                    defaultMessage='Your team, connected.'
                    id='mobile.encma.auth_tagline'
                    style={styles.tagline}
                    testID='encma_auth_header.tagline'
                />
            </View>
        </View>
    );
};

export default EncmaAuthHeader;
