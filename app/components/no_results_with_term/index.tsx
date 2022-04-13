// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import SearchIllustration from './search_illustration';

type Props = {
    term: string;
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

const NoResultsWithTerm = ({term}: Props) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    return (
        <View style={style.container}>
            <SearchIllustration/>
            <FormattedText
                id='mobile.no_results_with_term'
                defaultMessage='No results for {term}'
                values={{term}}
                style={style.result}
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
