// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text, View} from 'react-native';

import Markdown from '@components/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

type Props = {
    channelId: string;
    link?: string;
    location: string;
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
    const intl = useIntl();
    const style = getStyleSheet(theme);

    const openLink = () => {
        if (link) {
            const onError = () => {
                Alert.alert(
                    intl.formatMessage({
                        id: 'mobile.link.error.title',
                        defaultMessage: 'Error',
                    }),
                    intl.formatMessage({
                        id: 'mobile.link.error.text',
                        defaultMessage: 'Unable to open the link.',
                    }),
                );
            };

            tryOpenURL(link, onError);
        }
    };

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
                disableChannelLink={true}
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
