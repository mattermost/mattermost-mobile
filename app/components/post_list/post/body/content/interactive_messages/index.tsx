// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import {handleGotoLocation} from '@actions/remote/command';
import {postActionWithCookie} from '@actions/remote/integrations';
import {useServerUrl} from '@context/server';

import BlockRenderer, {type ActionHandler} from './block_renderer';
import {getPostInteractiveIntegrationFormat, translatePostProps} from './translation';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    layoutWidth?: number;
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
};

const InteractiveMessages = ({channelId, layoutWidth, location, post, theme}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const props = post.props as Record<string, unknown> | undefined;
    const mmBlocksActionsProp = props?.mm_blocks_actions;
    const mmBlocksActionsCookie = typeof mmBlocksActionsProp === 'string' ? mmBlocksActionsProp : undefined;

    const blocks = useMemo(() => {
        return translatePostProps(props ?? {});
    }, [props]);

    const handleAction: ActionHandler = useCallback(async (actionId, selectedOption, query, attachmentCookie) => {
        const integrationFormat = getPostInteractiveIntegrationFormat(props ?? {});
        let actionCookie = '';
        if (integrationFormat === 'attachment') {
            actionCookie = attachmentCookie ?? '';
        } else {
            actionCookie = mmBlocksActionsCookie ?? '';
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
    }, [intl, mmBlocksActionsCookie, post.id, props, serverUrl]);

    if (!blocks || blocks.length === 0) {
        return null;
    }

    return (
        <BlockRenderer
            blocks={blocks}
            channelId={channelId}
            imagesMetadata={post.metadata?.images as Record<string, PostImage> | undefined}
            layoutWidth={layoutWidth}
            location={location}
            onAction={handleAction}
            postId={post.id}
            theme={theme}
        />
    );
};

export default InteractiveMessages;
