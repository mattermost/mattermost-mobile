// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {useWindowDimensions, View} from 'react-native';
import FastImage, {Source} from 'react-native-fast-image';

import {TABLET_WIDTH} from '@components/sidebars/drawer_layout';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {DeviceTypes} from '@constants';
import {generateId} from '@utils/file';
import {openGallerWithMockFile} from '@utils/gallery';
import {calculateDimensions} from '@utils/images';
import {getNearestPoint} from '@utils/opengraph';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {isValidUrl} from '@utils/url';

import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/preferences';

type BestImage = {
    secure_url?: string;
    url?: string;
}

type OpengraphImageProps = {
    isReplyPost: boolean;
    post: Post;
    openGraphImages: never[];
    theme: Theme;
}

const MAX_IMAGE_HEIGHT = 150;
const VIEWPORT_IMAGE_OFFSET = 93;
const VIEWPORT_IMAGE_REPLY_OFFSET = 13;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        imageContainer: {
            alignItems: 'center',
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 1,
            borderRadius: 3,
            marginTop: 5,
        },
        image: {
            borderRadius: 3,
        },
    };
});

const getViewPostWidth = (isReplyPost: boolean, deviceHeight: number, deviceWidth: number) => {
    const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
    const viewPortWidth = deviceSize - VIEWPORT_IMAGE_OFFSET - (isReplyPost ? VIEWPORT_IMAGE_REPLY_OFFSET : 0);
    const tabletOffset = DeviceTypes.IS_TABLET ? TABLET_WIDTH : 0;

    return viewPortWidth - tabletOffset;
};

const OpengraphImage = ({isReplyPost, post, openGraphImages, theme}: OpengraphImageProps) => {
    const fileId = useRef(generateId()).current;
    const dimensions = useWindowDimensions();
    const style = getStyleSheet(theme);
    const bestDimensions = {
        height: MAX_IMAGE_HEIGHT,
        width: getViewPostWidth(isReplyPost, dimensions.height, dimensions.width),
    };
    const bestImage = getNearestPoint(bestDimensions, openGraphImages, 'width', 'height') as BestImage;
    const imageUrl = (bestImage.secure_url || bestImage.url)!;
    const imagesMetadata = post.metadata.images;

    let ogImage;
    if (imagesMetadata && imagesMetadata[imageUrl]) {
        ogImage = imagesMetadata[imageUrl];
    }

    if (!ogImage) {
        ogImage = openGraphImages.find((i: BestImage) => i.url === imageUrl || i.secure_url === imageUrl);
    }

    // Fallback when the ogImage does not have dimensions but there is a metaImage defined
    const metaImages = imagesMetadata ? Object.values(imagesMetadata) : null;
    if ((!ogImage?.width || !ogImage?.height) && metaImages?.length) {
        ogImage = metaImages[0];
    }

    let imageDimensions = bestDimensions;
    if (ogImage?.width && ogImage?.height) {
        imageDimensions = calculateDimensions(ogImage.height, ogImage.width, getViewPostWidth(isReplyPost, dimensions.height, dimensions.width));
    }

    const onPress = useCallback(() => {
        openGallerWithMockFile(imageUrl, post.id, imageDimensions.height, imageDimensions.width, fileId);
    }, []);

    const source: Source = {};
    if (isValidUrl(imageUrl)) {
        source.uri = imageUrl;
    }

    const dimensionsStyle = {width: imageDimensions.width, height: imageDimensions.height};
    return (
        <View style={[style.imageContainer, dimensionsStyle]}>
            <TouchableWithFeedback
                onPress={onPress}
                type={'none'}
            >
                <FastImage
                    style={[style.image, dimensionsStyle]}
                    source={source}
                    resizeMode='contain'
                    nativeID={`image-${fileId}`}
                />
            </TouchableWithFeedback>
        </View>
    );
};

export default OpengraphImage;
