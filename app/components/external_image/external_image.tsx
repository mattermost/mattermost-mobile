// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

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

    const baseRoute = useMemo(() => {
        try {
            return NetworkManager.getClient(serverUrl).getBaseRoute();
        } catch {
            return '';
        }
    }, [serverUrl]);

    const shouldRenderImage = enableSVGs || !isSVGImage(imageMetadata, src);
    let safeSrc = '';
    if (shouldRenderImage) {
        safeSrc = getImageSrc(src, baseRoute, hasImageProxy && Boolean(baseRoute));
    }
    return <>{children(safeSrc)}</>;
};

export default ExternalImage;
