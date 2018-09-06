// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

let previewComponents;
const IMAGE_MAX_HEIGHT = 150;
const IMAGE_MIN_DIMENSION = 50;

export const calculateDimensions = (height, width, viewPortWidth = 0, viewPortHeight = 0) => {
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
    } else if (imageHeight < IMAGE_MIN_DIMENSION) {
        imageHeight = IMAGE_MIN_DIMENSION;
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
