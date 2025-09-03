// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import Markdown from '@components/markdown';
import {useExternalLinkHandler} from '@hooks/use_external_link_handler';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    link?: string;
    location: AvailableScreens;
    theme: Theme;
    value?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 3,
        },
        link: {color: theme.linkColor},
        title: {
            color: theme.centerChannelColor,
            fontSize: 14,
            fontFamily: 'OpenSans-SemiBold',
            lineHeight: 20,
            marginBottom: 5,
        },
    };
});

const AttachmentTitle = ({channelId, link, location, theme, value}: Props) => {
    const style = getStyleSheet(theme);
    const openLink = useExternalLinkHandler(link);

    let title;
    if (link) {
        title = (
            <Text
                onPress={openLink}
                style={[style.title, Boolean(link) && style.link]}
            >
                {value}
            </Text>
        );
    } else {
        title = (
            <Markdown
                channelId={channelId}
                location={location}
                isEdited={false}
                isReplyPost={false}
                disableHashtags={true}
                disableAtMentions={true}
                disableGallery={true}
                autolinkedUrlSchemes={[]}
                mentionKeys={[]}
                theme={theme}
                value={value}
                baseTextStyle={style.title}
                textStyles={{link: style.link}}
            />
        );
    }

    return (
        <View style={style.container}>
            {title}
        </View>
    );
};

export default AttachmentTitle;
