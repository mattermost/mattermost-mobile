// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Markdown from '@components/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/preferences';

type Props = {
    theme: Theme;
    value: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginTop: 3,
            flex: 1,
            flexDirection: 'row',
        },
        title: {
            color: theme.centerChannelColor,
            fontWeight: '600',
            marginBottom: 5,
            fontSize: 14,
            lineHeight: 20,
        },
        link: {
            color: theme.linkColor,
        },
    };
});

const EmbedTitle = ({theme, value}: Props) => {
    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            <Markdown
                disableHashtags={true}
                disableAtMentions={true}
                disableChannelLink={true}
                disableGallery={true}
                autolinkedUrlSchemes={[]}
                mentionKeys={[]}
                theme={theme}
                value={value}
                baseTextStyle={style.title}
                textStyles={{link: style.link}}
            />
        </View>
    );
};

export default EmbedTitle;
