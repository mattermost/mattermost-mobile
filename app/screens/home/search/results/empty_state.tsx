// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import EmptyFiles from './empty_files';
import EmptyMessages from './empty_messages';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        alignItems: 'center',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        margin: 40,
        textAlign: 'center',
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 400),
    },
    paragraph: {
        marginTop: 8,
        textAlign: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 200),
    },
}));

type Props = {
    emptyFiles: boolean;
    searchValue: string;
}

export const EmptyState = ({emptyFiles, searchValue}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    let defaultTitle = `No matches found for "${searchValue}"`;
    let idTitle = 'screen.search.empty.messages.title';
    let defaultParagraph = 'Check the spelling or try another search.';
    let idParagraph = 'screen.search.empty.messages.paragraph';

    if (emptyFiles) {
        defaultTitle = 'No files yet';
        idTitle = 'screen.search.empty.messages.title';
        defaultParagraph = 'You\'ll see files here when someone attaches a file to a post in this channel.';
        idParagraph = 'screen.search.empty.messages.paragraph';
    }

    return (
        <View style={styles.container}>
            {emptyFiles ? <EmptyFiles/> : <EmptyMessages/>}
            <FormattedText
                defaultMessage={defaultTitle}
                id={idTitle}
                style={styles.title}
                testID='search.empty.title'
            />
            <FormattedText
                defaultMessage={defaultParagraph}
                id={idParagraph}
                style={styles.paragraph}
                testID='search.empty.paragraph'
            />
        </View>
    );
};

export default EmptyState;
