// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext, useMemo} from 'react';

import Markdown from '@components/markdown';

import {MmBlocksRenderContext} from './context';
import {getStyleSheet} from './styles';

type TextBlockProps = {
    block: MmTextBlock;
    theme: Theme;
};

export const TextBlock = ({block, theme}: TextBlockProps) => {
    const style = getStyleSheet(theme);
    const renderContext = useContext(MmBlocksRenderContext);

    const textStyle = useMemo(() => [
        style.message,
        block.is_subtle && style.textSubtle,
        block.size === 'small' && style.textSmall,
    ], [block.is_subtle, block.size, style]);

    if (!block.text || !renderContext) {
        return null;
    }

    const {channelId, inlineMarkdownActions, location, postId} = renderContext;
    const {mmBlocksActionCookie, integrationFormat} = inlineMarkdownActions;

    return (
        <Markdown
            allowInlineActions={true}
            baseTextStyle={textStyle}
            channelId={channelId}
            integrationFormat={integrationFormat}
            location={location}
            mmBlocksActionCookie={mmBlocksActionCookie}
            postId={postId}
            theme={theme}
            value={block.text}
        />
    );
};
