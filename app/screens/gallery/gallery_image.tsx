// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import FastImage from 'react-native-fast-image';
import Animated from 'react-native-reanimated';

import {DeviceTypes} from '@constants';
import {calculateDimensions} from '@utils/images';

import {GalleryItemProps} from 'types/screens/gallery';
import {SvgCssUri} from 'react-native-svg';
import {ErrorBoundary} from '@sentry/react';

// @ts-expect-error: Ignore the typescript error for createAnimatedComponent
const AnimatedImage = Animated.createAnimatedComponent(FastImage);

const GalleryImage = ({file, deviceHeight, deviceWidth, style}: GalleryItemProps) => {
    const {height, width, uri: imageUri, localPath} = file;
    const statusBar = DeviceTypes.IS_IPHONE_WITH_INSETS ? 60 : 20;
    const calculatedDimensions = calculateDimensions(height, width, deviceWidth, deviceHeight - statusBar);
    const uri = localPath || imageUri;

    if (file.extension === 'svg') {
        return (
            <ErrorBoundary>
                <SvgCssUri
                    uri={uri || null}
                    width={'100%'}
                    height={'200'}
                    style={[{maxWidth: '100%', maxHeight: '100%'}]}
                />
            </ErrorBoundary>
        );
    }
    return (
        <AnimatedImage
            source={{uri}}
            style={[{...calculatedDimensions}, style]}
            nativeID={`gallery-${file.id}`}
        />
    );
};

export default GalleryImage;
