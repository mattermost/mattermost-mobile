// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import {handleGotoLocation} from '@actions/remote/command';
import {postActionWithCookie} from '@actions/remote/integrations';
import {BlockRenderer, type ActionHandler} from '@components/block_renderer';
import {getPostInteractiveIntegrationFormat, translatePostProps} from '@components/block_renderer/translation';
import {useServerUrl} from '@context/server';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
};

const InteractiveMessages = ({channelId, location, post, theme}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const props = post.props as Record<string, unknown> | undefined;
    const mmBlocksActionsProp = props?.mm_blocks_actions;
    const mmBlocksActionCookie = typeof mmBlocksActionsProp === 'string' ? mmBlocksActionsProp : undefined;
    const integrationFormat = getPostInteractiveIntegrationFormat(props ?? {});

    const blocks = useMemo(() => {
        return translatePostProps(props ?? {}, intl);
    }, [props, intl]);

    const inlineMarkdownActions = useMemo(() => {
        return {
            mmBlocksActionCookie,
            integrationFormat,
        };
    }, [mmBlocksActionCookie, integrationFormat]);

    const handleAction: ActionHandler = useCallback(async (actionId, selectedOption, query, attachmentCookie) => {
        let actionCookie = '';
        if (integrationFormat === 'attachment') {
            actionCookie = attachmentCookie ?? '';
        } else {
            actionCookie = mmBlocksActionCookie ?? '';
        }
        const {data, error} = await postActionWithCookie(
            serverUrl,
            post.id,
            actionId,
            actionCookie,
            selectedOption ?? '',
            query,
            integrationFormat,
        );
        if (!error && data?.goto_location) {
            handleGotoLocation(serverUrl, intl, data.goto_location);
        }
    }, [intl, integrationFormat, mmBlocksActionCookie, post.id, serverUrl]);

    if (!blocks || blocks.length === 0) {
        return null;
    }

    return (
        <BlockRenderer
            blocks={blocks}
            channelId={channelId}
            imagesMetadata={post.metadata?.images as Record<string, PostImage> | undefined}
            inlineMarkdownActions={inlineMarkdownActions}
            location={location}
            onAction={handleAction}
            postId={post.id}
            theme={theme}
        />
    );
};

export default InteractiveMessages;
