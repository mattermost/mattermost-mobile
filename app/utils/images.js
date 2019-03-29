// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    IMAGE_MAX_HEIGHT,
    IMAGE_MIN_DIMENSION,
} from 'app/constants/image';

let previewComponents;

export const calculateDimensions = (height, width, viewPortWidth = 0, viewPortHeight = 0) => {
    if (!height || !width) {
        return {
            height: null,
            width: null,
        };
    }

    const ratio = height / width;
    const heightRatio = width / height;

    let imageWidth = width;
    let imageHeight = height;

    if (width > viewPortWidth) {
        imageWidth = viewPortWidth;
        imageHeight = imageWidth * ratio;
    } else if (width < IMAGE_MIN_DIMENSION) {
        imageWidth = IMAGE_MIN_DIMENSION;
        imageHeight = imageWidth * ratio;
    }

    if (
        (
            imageHeight > IMAGE_MAX_HEIGHT ||
            (viewPortHeight && imageHeight > viewPortHeight)
        ) && viewPortHeight <= IMAGE_MAX_HEIGHT
    ) {
        imageHeight = viewPortHeight || IMAGE_MAX_HEIGHT;
        imageWidth = imageHeight * heightRatio;
    } else if (
        imageHeight < IMAGE_MIN_DIMENSION &&
        IMAGE_MIN_DIMENSION * heightRatio <= viewPortWidth
    ) {
        imageHeight = IMAGE_MIN_DIMENSION;
        imageWidth = imageHeight * heightRatio;
    } else if (viewPortHeight && imageHeight > viewPortHeight) {
        imageHeight = viewPortHeight;
        imageWidth = imageHeight * heightRatio;
    }

    return {
        height: imageHeight,
        width: imageWidth,
    };
};

export function previewImageAtIndex(navigator, components, index, files) {
    previewComponents = components;
    const component = components[index];
    if (component) {
        component.measure((rx, ry, width, height, x, y) => {
            goToImagePreview(
                navigator,
                {
                    index,
                    origin: {x, y, width, height},
                    target: {x: 0, y: 0, opacity: 1},
                    files,
                    getItemMeasures,
                }
            );
        });
    }
}

function goToImagePreview(navigator, passProps) {
    navigator.showModal({
        screen: 'ImagePreview',
        title: '',
        animationType: 'none',
        passProps,
        navigatorStyle: {
            navBarHidden: true,
            statusBarHidden: false,
            statusBarHideWithNavBar: false,
            screenBackgroundColor: 'transparent',
            modalPresentationStyle: 'overCurrentContext',
        },
    });
}

function getItemMeasures(index, cb) {
    const activeComponent = previewComponents[index];

    if (!activeComponent) {
        cb(null);
        return;
    }

    activeComponent.measure((rx, ry, width, height, x, y) => {
        cb({
            origin: {x, y, width, height},
        });
    });
}
