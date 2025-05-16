// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';
import {onOpenLinkError} from '@utils/url/links';

import OpengraphImage from './opengraph_image';

type OpengraphProps = {
    isReplyPost: boolean;
    layoutWidth?: number;
    location: string;
    metadata: PostMetadata | undefined | null;
    postId: string;
    showLinkPreviews: boolean;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRadius: 3,
            borderWidth: 1,
            flex: 1,
            marginTop: 10,
            padding: 10,
        },
        flex: {flex: 1},
        siteDescription: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            fontSize: 13,
            marginBottom: 10,
        },
        siteName: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 12,
            marginBottom: 10,
        },
        siteTitle: {
            color: theme.linkColor,
            fontSize: 14,
            marginBottom: 10,
        },
    };
});

const selectOpenGraphData = (url: string, metadata: PostMetadata | undefined | null) => {
    if (!metadata?.embeds) {
        return undefined;
    }

    return metadata.embeds.find((embed) => {
        return embed.type === 'opengraph' && embed.url === url ? embed.data : undefined;
    })?.data;
};

const Opengraph = ({isReplyPost, layoutWidth, location, metadata, postId, showLinkPreviews, theme}: OpengraphProps) => {
    const intl = useIntl();
    const link = metadata?.embeds![0]!.url || '';
    const openGraphData = selectOpenGraphData(link, metadata);

    if (!showLinkPreviews || !openGraphData) {
        return null;
    }

    const style = getStyleSheet(theme);
    const hasImage = Boolean(
        openGraphData?.images &&
        openGraphData.images instanceof Array &&
        openGraphData.images.length &&
        metadata?.images);

    const goToLink = useCallback(() => {
        const onError = () => {
            onOpenLinkError(intl);
        };

        tryOpenURL(link, onError);
    }, [intl, link]);

    let siteName;
    if (openGraphData.site_name) {
        siteName = (
            <View style={style.flex}>
                <Text
                    style={style.siteName}
                    numberOfLines={1}
                    ellipsizeMode='tail'
                >
                    {openGraphData.site_name as string}
                </Text>
            </View>
        );
    }

    const title: string | undefined = openGraphData.title || openGraphData.url || link;
    let siteTitle;
    if (title) {
        siteTitle = (
            <View>
                <TouchableOpacity
                    style={style.flex}
                    onPress={goToLink}
                >
                    <Text
                        style={[style.siteTitle, {marginRight: isReplyPost ? 10 : 0}]}
                        numberOfLines={3}
                        ellipsizeMode='tail'
                    >
                        {title}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    let siteDescription;
    if (openGraphData.description) {
        siteDescription = (
            <View style={style.flex}>
                <Text
                    style={style.siteDescription}
                    numberOfLines={5}
                    ellipsizeMode='tail'
                >
                    {openGraphData.description as string}
                </Text>
            </View>
        );
    }

    return (
        <View style={style.container}>
            {siteName}
            {siteTitle}
            {siteDescription}
            {hasImage &&
            <OpengraphImage
                isReplyPost={isReplyPost}
                layoutWidth={layoutWidth}
                location={location}
                openGraphImages={openGraphData.images as never[]}
                metadata={metadata}
                postId={postId}
                theme={theme}
            />
            }
        </View>
    );
};

export default React.memo(Opengraph);
