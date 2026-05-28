// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';

import Markdown from '@components/markdown';

import {MmBlocksInlineMarkdownActionsContext, MmBlocksInteractionContext, MmBlocksRenderContext} from './context';
import {getStyleSheet} from './styles';

type TextBlockProps = {
    block: MmTextBlock;
    postId: string;
    theme: Theme;
};

export const TextBlock = ({block, postId, theme}: TextBlockProps) => {
    const style = getStyleSheet(theme);
    const {channelId, location} = useContext(MmBlocksRenderContext)!;
    const {mmBlocksActionCookie, integrationFormat} = useContext(MmBlocksInlineMarkdownActionsContext);
    const interactionsEnabled = useContext(MmBlocksInteractionContext);

    if (!block.text) {
        return null;
    }

    const textStyle = [
        style.message,
        block.is_subtle && style.textSubtle,
        block.size === 'small' && style.textSmall,
    ];

    return (
        <Markdown
            allowInlineActions={interactionsEnabled}
            baseTextStyle={textStyle}
            channelId={channelId}
            disableGallery={!interactionsEnabled}
            disableHashtags={!interactionsEnabled}
            disableLinks={!interactionsEnabled}
            enableInlineLatex={true}
            enableLatex={true}
            integrationFormat={integrationFormat}
            location={location}
            maxNodes={1000}
            mmBlocksActionCookie={mmBlocksActionCookie}
            postId={postId}
            theme={theme}
            value={block.text}
        />
    );
};
