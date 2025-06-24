// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {View, StyleSheet, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    message?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
        zIndex: 1,
    },
    icon: {
        marginBottom: 10,
    },
    title: {
        ...typography('Body', 100, 'Regular'),
        color: theme.centerChannelColor,
        marginBottom: 5,
        textAlign: 'center',
    },
    message: {
        ...typography('Body', 75, 'Regular'),
        color: theme.centerChannelColor,
        marginBottom: 15,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
}));

const PdfLoadError = ({message}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <CompassIcon
                name='file-pdf-outline-large'
                size={52}
                color={theme.errorTextColor}
                style={styles.icon}
            />
            <FormattedText
                id='mobile.pdf_viewer.load_failed'
                defaultMessage='Unable to open the PDF file.'
                style={styles.title}
            />
            {Boolean(message) && (
                <Text style={styles.message}>
                    {message}
                </Text>
            )}
        </View>
    );
};

export default PdfLoadError;
