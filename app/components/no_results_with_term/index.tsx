// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import SearchFilesIllustration from './search_files_illustration';
import SearchIllustration from './search_illustration';

type Props = {
    term: string;
    type?: 'default' | 'messages' | 'files';
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexGrow: 1,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        result: {
            color: theme.centerChannelColor,
            ...typography('Heading', 400, 'SemiBold'),
        },
        spelling: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            marginTop: 8,
            ...typography('Body', 200),
        },
    };
});

const NoResultsWithTerm = ({term, type}: Props) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const [titleId, setTitleId] = useState(t('mobile.no_results_with_term'));
    const [defaultMessage, setDefaultMessage] = useState('No results for “{term}”');

    useEffect(() => {
        if (type === 'files') {
            setTitleId(t('mobile.no_results_with_term.files'));
            setDefaultMessage('No files matching “{term}”');
        } else if (type === 'messages') {
            setTitleId(t('mobile.no_results_with_term.messages'));
            setDefaultMessage('No matches found for “{term}”');
        }
    }, [type]);

    return (
        <View style={style.container}>
            {type === 'files' ? <SearchFilesIllustration/> : <SearchIllustration/>}
            <FormattedText
                id={titleId}
                defaultMessage={defaultMessage}
                style={style.result}
                values={{term}}
            />
            <FormattedText
                id='mobile.no_results.spelling'
                defaultMessage='Check the spelling or try another search.'
                style={style.spelling}
            />
        </View>
    );
};

export default NoResultsWithTerm;
