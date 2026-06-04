// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';

import {useServerUrl} from '@context/server';
import NetworkManager from '@managers/network_manager';

import {getImageSrc} from './get_image_src';
import {isSVGImage} from './is_svg_image';

export type ExternalImageProps = {
    children: (src: string) => React.ReactNode;
    enableSVGs: boolean;
    hasImageProxy: boolean;
    imageMetadata?: PostImage;
    src: string;
};

const ExternalImage = ({children, enableSVGs, hasImageProxy, imageMetadata, src}: ExternalImageProps) => {
    const serverUrl = useServerUrl();

    let baseRoute = '';
    try {
        baseRoute = NetworkManager.getClient(serverUrl).getBaseRoute();
    } catch {
        // Client unavailable; proxying is skipped below when baseRoute is empty.
    }

    const shouldRenderImage = enableSVGs || !isSVGImage(imageMetadata, src);
    let safeSrc = getImageSrc(src, baseRoute, hasImageProxy && Boolean(baseRoute));
    if (!shouldRenderImage) {
        safeSrc = '';
    }
    return <>{children(safeSrc)}</>;
};

export default memo(ExternalImage);
