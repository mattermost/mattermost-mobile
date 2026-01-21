// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    translationState?: PostTranslation['state'];
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        translationProcessing: {
            color: theme.centerChannelColor,
            opacity: 0.56,
            ...typography('Body', 75, 'Regular'),
        },
    };
});

function TranslateIcon({
    translationState,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    if (translationState === 'ready') {
        return (
            <CompassIcon
                name='translate'
                size={16}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
            />
        );
    }

    if (translationState === 'processing') {
        return (
            <>
                <Loading
                    size='small'
                    color={changeOpacity(theme.centerChannelColor, 0.56)}
                />
                <FormattedText
                    id='post_header.translation_processing'
                    defaultMessage='Translating...'
                    style={style.translationProcessing}
                />
            </>
        );
    }

    if (translationState === 'unavailable') {
        return (
            <CompassIcon
                name='translate'
                size={16}
                color={theme.dndIndicator}
            />
        );
    }

    return null;
}

export default TranslateIcon;
