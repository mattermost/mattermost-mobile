// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import Svg, {Path, Text as SvgText} from 'react-native-svg';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        backgroundColor: theme.centerChannelBg,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 12,
        paddingRight: 16,
        marginTop: 8,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
        fontStyle: 'italic',
    },
    subtitle: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 75, 'Regular'),
        fontStyle: 'italic',
        marginTop: 2,
    },
}));

const RedactedFilesPlaceholder = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const iconColor = changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <View
            style={styles.container}
            testID='redacted-files-placeholder'
        >
            <Svg
                width={32}
                height={40}
                viewBox='0 0 32 40'
                fill='none'
                testID='redacted-files-placeholder.icon'
            >
                <Path
                    d='M28 0H11.898C11.104 0 10.356 0.308 9.79 0.864L0.892 9.644C0.326 10.206 0 10.984 0 11.78V36C0 38.206 1.794 40 4 40H28C30.206 40 32 38.206 32 36V4C32 1.794 30.206 0 28 0ZM10 3.468V11H2.368L10 3.468ZM30 36C30 37.102 29.102 38 28 38H4C2.896 38 2 37.102 2 36V13H10C11.104 13 12 12.104 12 11V2H28C29.102 2 30 2.896 30 4V36Z'
                    fill={iconColor}
                />
                <SvgText
                    x='16'
                    y='30'
                    fontSize='14'
                    fontWeight='600'
                    fill={iconColor}
                    textAnchor='middle'
                >
                    {'?'}
                </SvgText>
            </Svg>
            <View style={styles.textContainer}>
                <FormattedText
                    id='post.redacted_files.title'
                    defaultMessage='Files not available'
                    style={styles.title}
                    testID='redacted-files-placeholder.title'
                />
                <FormattedText
                    id='post.redacted_files.subtitle'
                    defaultMessage='Access to files is restricted based on attributes'
                    style={styles.subtitle}
                    testID='redacted-files-placeholder.subtitle'
                />
            </View>
        </View>
    );
};

export default RedactedFilesPlaceholder;
