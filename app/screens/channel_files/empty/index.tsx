// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import SearchFilesIllustration from '@components/no_results_with_term/search_files_illustration';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        maxWidth: 480,
    },
    title: {
        color: theme.centerChannelColor,
        textAlign: 'center',
        ...typography('Heading', 400, 'SemiBold'),
    },
    paragraph: {
        marginTop: 8,
        textAlign: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 200),
    },
}));

function EmptySavedPosts() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <SearchFilesIllustration/>
            <FormattedText
                defaultMessage='No files yet'
                id='channel_files.empty.title'
                style={styles.title}
                testID='channel_files.empty.title'
            />
            <FormattedText
                defaultMessage={'Files posted in this channel will show here.'}
                id='channel_files.empty.paragraph'
                style={styles.paragraph}
                testID='channel_files.empty.paragraph'
            />
        </View>
    );
}

export default EmptySavedPosts;
