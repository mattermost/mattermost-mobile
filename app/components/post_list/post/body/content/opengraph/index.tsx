// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text, View} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

import OpengraphImage from './opengraph_image';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';

type OpengraphProps = {
    isReplyPost: boolean;
    metadata: PostMetadata;
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

const selectOpenGraphData = (url: string, metadata: PostMetadata) => {
    if (!metadata.embeds) {
        return undefined;
    }

    return metadata.embeds.find((embed) => {
        return embed.type === 'opengraph' && embed.url === url ? embed.data : undefined;
    })?.data;
};

const Opengraph = ({isReplyPost, metadata, postId, showLinkPreviews, theme}: OpengraphProps) => {
    const intl = useIntl();
    const link = metadata.embeds![0]!.url;
    const openGraphData = selectOpenGraphData(link, metadata);

    if (!showLinkPreviews || !openGraphData) {
        return null;
    }

    const style = getStyleSheet(theme);
    const hasImage = Boolean(
        openGraphData?.images &&
        openGraphData.images instanceof Array &&
        openGraphData.images.length &&
        metadata.images);

    const goToLink = () => {
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
    };

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

    const title = openGraphData.title || openGraphData.url || link;
    let siteTitle;
    if (title) {
        siteTitle = (
            <View style={style.wrapper}>
                <TouchableWithFeedback
                    style={style.flex}
                    onPress={goToLink}
                    type={'opacity'}
                >
                    <Text
                        style={[style.siteTitle, {marginRight: isReplyPost ? 10 : 0}]}
                        numberOfLines={3}
                        ellipsizeMode='tail'
                    >
                        {title as string}
                    </Text>
                </TouchableWithFeedback>
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
                openGraphImages={openGraphData.images as never[]}
                metadata={metadata}
                postId={postId}
                theme={theme}
            />
            }
        </View>
    );
};

const withOpenGraphInput = withObservables(
    ['removeLinkPreview'], ({database, removeLinkPreview}: WithDatabaseArgs & {removeLinkPreview: boolean}) => {
        if (removeLinkPreview) {
            return {showLinkPreviews: of$(false)};
        }

        const showLinkPreviews = database.get(MM_TABLES.SERVER.PREFERENCE).query(
            Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS),
            Q.where('name', Preferences.LINK_PREVIEW_DISPLAY),
        ).observe().pipe(
            switchMap(
                (preferences: PreferenceModel[]) => database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((config: SystemModel) => {
                        const cfg: ClientConfig = config.value;
                        const previewsEnabled = getPreferenceAsBool(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.LINK_PREVIEW_DISPLAY, true);
                        return of$(previewsEnabled && cfg.EnableLinkPreviews === 'true');
                    }),
                ),
            ),
        );

        return {showLinkPreviews};
    });

export default withDatabase(withOpenGraphInput(React.memo(Opengraph)));
