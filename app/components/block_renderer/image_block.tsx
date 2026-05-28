// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';
import {View, type ViewStyle} from 'react-native';

import {removeImageProxyForKey} from '@utils/markdown';
import {secureGetFromRecord} from '@utils/types';

import {MmBlocksImagesMetadataContext} from './context';
import {resolveMmImageCaps} from './image_utils';
import MmBlocksImage from './mm_blocks_image';
import {getStyleSheet} from './styles';

type ImageBlockProps = {
    block: MmImageBlock;
    postId: string;
    theme: Theme;
};

export const ImageBlock = ({block, postId, theme}: ImageBlockProps) => {
    const style = getStyleSheet(theme);
    const imagesMetadata = useContext(MmBlocksImagesMetadataContext);
    const url = typeof block.url === 'string' ? block.url.trim() : '';
    const metadataKey = removeImageProxyForKey(url);
    const imageMetadata = secureGetFromRecord(imagesMetadata, metadataKey) ?? secureGetFromRecord(imagesMetadata, url);
    const caps = resolveMmImageCaps(block);

    if (!url) {
        return null;
    }

    const align = block.horizontal_alignment ?? 'left';
    let alignStyle: ViewStyle = style.imageAlignLeft;
    if (align === 'center') {
        alignStyle = style.imageAlignCenter;
    } else if (align === 'right') {
        alignStyle = style.imageAlignRight;
    }

    return (
        <View style={[style.imageRow, alignStyle]}>
            <MmBlocksImage
                altText={block.alt_text}
                caps={caps}
                imageMetadata={imageMetadata}
                imageStyle={block.image_style}
                imageUrl={url}
                postId={postId}
                theme={theme}
            />
        </View>
    );
};
