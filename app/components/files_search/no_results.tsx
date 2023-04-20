// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import SearchFilesIllustration from '@components/no_results_with_term/search_files_illustration';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const TEST_ID = 'channel_files';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flexGrow: 1,
        paddingHorizontal: 32,
        height: '100%',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
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

type Props = {
    isFilterEnabled?: boolean;
}
function NoResults({isFilterEnabled}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <SearchFilesIllustration/>
            {!isFilterEnabled && (
                <>
                    <FormattedText
                        defaultMessage='No files yet'
                        id='channel_files.empty.title'
                        style={styles.title}
                        testID={`${TEST_ID}.empty.title`}
                    />
                    <FormattedText
                        defaultMessage={'Files posted in this channel will show here.'}
                        id='channel_files.empty.paragraph'
                        style={styles.paragraph}
                        testID={`${TEST_ID}.empty.paragraph`}
                    />
                </>
            )}
            {isFilterEnabled && (
                <>
                    <FormattedText
                        defaultMessage='No files Found'
                        id='channel_files.noFiles.title'
                        style={styles.title}
                        testID={`${TEST_ID}.empty.title`}
                    />
                    <FormattedText
                        defaultMessage={'This channel doesn\'t contain any files with the applied filters'}
                        id='channel_files.noFiles.paragraph'
                        style={styles.paragraph}
                        testID={`${TEST_ID}.empty.paragraph`}
                    />
                </>
            )}
        </View>
    );
}

export default NoResults;
