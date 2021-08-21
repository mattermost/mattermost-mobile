// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type HeaderCommentedOnProps = {
    locale: string;
    name: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        commentedOn: {
            color: changeOpacity(theme.centerChannelColor, 0.65),
            marginBottom: 3,
            lineHeight: 21,
        },
    };
});

const HeaderCommentedOn = ({locale, name, theme}: HeaderCommentedOnProps) => {
    const style = getStyleSheet(theme);
    let apostrophe;
    if (locale.toLowerCase().startsWith('en')) {
        if (name.slice(-1) === 's') {
            apostrophe = '\'';
        } else {
            apostrophe = '\'s';
        }
    }

    return (
        <FormattedText
            id='post_body.commentedOn'
            defaultMessage='Commented on {name}{apostrophe} message: '
            values={{
                name,
                apostrophe,
            }}
            style={style.commentedOn}
            testID='post_header.commented_on'
        />
    );
};

export default HeaderCommentedOn;
