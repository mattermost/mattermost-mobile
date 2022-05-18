// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import EmptyFiles from './empty_files';
import EmptyMessages from './empty_messages';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 40,
        textAlign: 'center',
        flexGrow: 1,
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
    showMessagesTab: boolean;
    searchValue: string;
}

export const EmptyState = ({showMessagesTab, searchValue}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    let defaultTitle = 'No files matching "{searchValue}"';
    let idTitle = t('screen.search.empty.files.title');

    if (showMessagesTab) {
        defaultTitle = 'No matches found for "{searchValue}"';
        idTitle = t('screen.search.empty.messages.title');
    }

    return (
        <View style={styles.container}>
            {showMessagesTab ? <EmptyMessages/> : <EmptyFiles/>}
            <FormattedText
                defaultMessage={defaultTitle}
                id={idTitle}
                style={styles.title}
                testID='search.empty.title'
                values={{
                    searchValue,
                }}
            />
            <FormattedText
                defaultMessage={'Check the spelling or try another search.'}
                id={'screen.search.empty.paragraph'}
                style={styles.paragraph}
                testID='search.empty.paragraph'
            />
        </View>
    );
};

export default EmptyState;
