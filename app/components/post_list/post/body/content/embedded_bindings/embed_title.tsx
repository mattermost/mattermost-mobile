// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Markdown from '@components/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    channelId: string;
    location: string;
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
            fontFamily: 'OpenSans-SemiBold',
            marginBottom: 5,
            fontSize: 14,
            lineHeight: 20,
        },
        link: {
            color: theme.linkColor,
        },
    };
});

const EmbedTitle = ({channelId, location, theme, value}: Props) => {
    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            <Markdown
                channelId={channelId}
                disableHashtags={true}
                disableAtMentions={true}
                disableChannelLink={true}
                disableGallery={true}
                location={location}
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
