// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {TabTypes, type TabType} from '@utils/search';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import SearchFilesIllustration from './search_files_illustration';
import SearchIllustration from './search_illustration';

type Props = {
    term: string;
    type?: TabType;
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexGrow: 1,
            paddingHorizontal: 32,
            height: '100%',
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        result: {
            marginTop: 32,
            textAlign: 'center',
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
        setTitleId(type === TabTypes.FILES ? t('mobile.no_results_with_term.files') : t('mobile.no_results_with_term.messages'));
        setDefaultMessage(type === TabTypes.FILES ? 'No files matching “{term}”' : 'No matches found for “{term}”');
    }, [type]);

    return (
        <View style={style.container}>
            {type === TabTypes.FILES ? <SearchFilesIllustration/> : <SearchIllustration/>}
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
