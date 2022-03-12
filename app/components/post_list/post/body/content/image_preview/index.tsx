// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {TapGestureHandler} from 'react-native-gesture-handler';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {getRedirectLocation} from '@actions/remote/general';
import FileIcon from '@components/post_list/post/body/files/file_icon';
import ProgressiveImage from '@components/progressive_image';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {GalleryInit} from '@context/gallery';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {useGalleryItem} from '@hooks/gallery';
import {lookupMimeType} from '@utils/file';
import {openGalleryAtIndex} from '@utils/gallery';
import {generateId} from '@utils/general';
import {calculateDimensions, getViewPortWidth, isGifTooLarge} from '@utils/images';
import {changeOpacity} from '@utils/theme';
import {extractFilenameFromUrl, isImageLink, isValidUrl} from '@utils/url';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

type ImagePreviewProps = {
    expandedLink?: string;
    isReplyPost: boolean;
    link: string;
    layoutWidth?: number;
    location: string;
    metadata: PostMetadata;
    postId: string;
    theme: Theme;
}

const style = StyleSheet.create({
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

const ImagePreview = ({expandedLink, isReplyPost, layoutWidth, link, location, metadata, postId, theme}: ImagePreviewProps) => {
    const galleryIdentifier = `${postId}-ImagePreview-${location}`;
    const [error, setError] = useState(false);
    const serverUrl = useServerUrl();
    const fileId = useRef(generateId('uid')).current;
    const [imageUrl, setImageUrl] = useState(expandedLink || link);
    const isTablet = useIsTablet();
    const imageProps = metadata.images![link];
    const dimensions = calculateDimensions(imageProps.height, imageProps.width, layoutWidth || getViewPortWidth(isReplyPost, isTablet));

    const onError = useCallback(() => {
        setError(true);
    }, []);

    const onPress = () => {
        const item: GalleryItemType = {
            id: fileId,
            postId,
            uri: imageUrl,
            width: imageProps.width,
            height: imageProps.height,
            name: extractFilenameFromUrl(imageUrl) || 'imagePreview.png',
            mime_type: lookupMimeType(imageUrl) || 'images/png',
            type: 'image',
        };
        openGalleryAtIndex(galleryIdentifier, 0, [item]);
    };

    const {ref, onGestureEvent, styles} = useGalleryItem(
        galleryIdentifier,
        0,
        onPress,
    );

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
            <View style={[style.imageContainer, {height: dimensions.height, borderWidth: 1, borderColor: changeOpacity(theme.centerChannelColor, 0.2)}]}>
                <View style={[style.image, {width: dimensions.width, height: dimensions.height}]}>
                    <FileIcon
                        failed={true}
                    />
                </View>
            </View>
        );
    }

    return (
        <GalleryInit galleryIdentifier={galleryIdentifier}>
            <Animated.View style={[styles, style.imageContainer, {height: dimensions.height}]}>
                <TapGestureHandler onGestureEvent={onGestureEvent}>
                    <Animated.View testID={`ImagePreview-${fileId}`}>
                        <ProgressiveImage
                            forwardRef={ref}
                            id={fileId}
                            imageUri={imageUrl}
                            onError={onError}
                            resizeMode='contain'
                            style={[style.image, {width: dimensions.width, height: dimensions.height}]}
                        />
                    </Animated.View>
                </TapGestureHandler>
            </Animated.View>
        </GalleryInit>
    );
};

const withExpandedLink = withObservables(['metadata'], ({database, metadata}: WithDatabaseArgs & {metadata: PostMetadata}) => {
    const link = metadata.embeds?.[0].url;

    return {
        expandedLink: database.get(MM_TABLES.SERVER.SYSTEM).query(
            Q.where('id', SYSTEM_IDENTIFIERS.EXPANDED_LINKS),
        ).observe().pipe(
            switchMap((values: SystemModel[]) => (
                (link && values.length) ? of$((values[0].value as Record<string, string>)[link]) : of$(undefined)),
            ),
        ),
        link: of$(link),
    };
});

export default withDatabase(withExpandedLink(React.memo(ImagePreview)));
