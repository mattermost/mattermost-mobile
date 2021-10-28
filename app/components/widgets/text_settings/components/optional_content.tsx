// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type OptionalContentProps = {
    optional: boolean;
    theme: Theme;
}

const OptionalContent = ({optional, theme}: OptionalContentProps) => {
    const style = getStyleSheet(theme);

    if (optional) {
        <FormattedText
            style={style.optional}
            id='channel_modal.optional'
            defaultMessage='(optional)'
        />;
    }

    return (
        <Text style={style.asterisk}>{' *'}</Text>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        optional: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 14,
            marginLeft: 5,
        },
    };
});

export default OptionalContent;
