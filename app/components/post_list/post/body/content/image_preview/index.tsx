// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {getRedirectLocation} from '@actions/remote/general';
import FileIcon from '@components/post_list/post/body/files/file_icon';
import ProgressiveImage from '@components/progressive_image';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {observeExpandedLinks} from '@queries/servers/system';
import {openGallerWithMockFile} from '@utils/gallery';
import {generateId} from '@utils/general';
import {calculateDimensions, getViewPortWidth, isGifTooLarge} from '@utils/images';
import {changeOpacity} from '@utils/theme';
import {isImageLink, isValidUrl} from '@utils/url';

import type {WithDatabaseArgs} from '@typings/database/database';

type ImagePreviewProps = {
    expandedLink?: string;
    isReplyPost: boolean;
    link: string;
    metadata: PostMetadata;
    postId: string;
    theme: Theme;
}

const styles = StyleSheet.create({
    imageContainer: {
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginBottom: 6,
        marginTop: 10,
    },
    image: {
        alignItems: 'center',
        borderRadius: 3,
        justifyContent: 'center',
        marginVertical: 1,
    },
});

const ImagePreview = ({expandedLink, isReplyPost, link, metadata, postId, theme}: ImagePreviewProps) => {
    const [error, setError] = useState(false);
    const serverUrl = useServerUrl();
    const fileId = useRef(generateId()).current;
    const [imageUrl, setImageUrl] = useState(expandedLink || link);
    const isTablet = useIsTablet();
    const imageProps = metadata.images![link];
    const dimensions = calculateDimensions(imageProps.height, imageProps.width, getViewPortWidth(isReplyPost, isTablet));

    const onError = useCallback(() => {
        setError(true);
    }, []);

    const onPress = useCallback(() => {
        openGallerWithMockFile(imageUrl, postId, imageProps.height, imageProps.width, fileId);
    }, [imageUrl]);

    useEffect(() => {
        if (!isImageLink(link) && expandedLink === undefined) {
            getRedirectLocation(serverUrl, link);
        }
    }, [link]);

    useDidUpdate(() => {
        if (expandedLink) {
            setImageUrl(expandedLink);
        } else if (link !== imageUrl) {
            setImageUrl(link);
        }
    }, [link]);

    useEffect(() => {
        if (expandedLink && expandedLink !== imageUrl) {
            setImageUrl(expandedLink);
        }
    }, [expandedLink]);

    if (error || !isValidUrl(expandedLink || link) || isGifTooLarge(imageProps)) {
        return (
            <View style={[styles.imageContainer, {height: dimensions.height, borderWidth: 1, borderColor: changeOpacity(theme.centerChannelColor, 0.2)}]}>
                <View style={[styles.image, {width: dimensions.width, height: dimensions.height}]}>
                    <FileIcon
                        failed={true}
                    />
                </View>
            </View>
        );
    }

    // Note that the onPress prop of TouchableWithoutFeedback only works if its child is a View
    return (
        <TouchableWithFeedback
            onPress={onPress}
            style={[styles.imageContainer, {height: dimensions.height}]}
            type={'none'}
        >
            <View>
                <ProgressiveImage
                    id={fileId}
                    style={[styles.image, {width: dimensions.width, height: dimensions.height}]}
                    imageUri={imageUrl}
                    resizeMode='contain'
                    onError={onError}
                />
            </View>
        </TouchableWithFeedback>
    );
};

const withExpandedLink = withObservables(['metadata'], ({database, metadata}: WithDatabaseArgs & {metadata: PostMetadata}) => {
    const link = metadata.embeds?.[0].url;

    return {
        expandedLink: observeExpandedLinks(database).pipe(
            switchMap((value) => (
                (link && value) ? of$(value[link]) : of$(undefined)),
            ),
        ),
        link: of$(link),
    };
});

export default withDatabase(withExpandedLink(React.memo(ImagePreview)));
