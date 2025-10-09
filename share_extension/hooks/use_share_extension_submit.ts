// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';

import {getServerCredentials} from '@init/credentials';
import {useShareExtensionState} from '@share/state';

type Props = {
    isDraft?: boolean;
}

export function useShareExtensionSubmit() {
    const {
        closeExtension, channelId, files, globalError,
        linkPreviewUrl, message, serverUrl, userId,
    } = useShareExtensionState();

    const buildText = useCallback(() => {
        let text = message || '';
        if (linkPreviewUrl) {
            if (text) {
                text = `${text}\n\n${linkPreviewUrl}`;
            } else {
                text = linkPreviewUrl;
            }
        }
        return text;
    }, [message, linkPreviewUrl]);

    const disabled =
        !serverUrl ||
        !channelId ||
        (!message && !files.length && !linkPreviewUrl) ||
        globalError;

    const submit = useCallback(async ({isDraft = false}: Props = {}) => {
        if (!serverUrl || !channelId || !userId) {
            return;
        }

        const credentials = await getServerCredentials(serverUrl);
        if (!credentials?.token) {
            return;
        }

        closeExtension({
            serverUrl,
            token: credentials.token,
            channelId,
            files,
            message: buildText(),
            userId,
            preauthSecret: credentials.preauthSecret,
            isDraft,
        });
    }, [serverUrl, channelId, userId, closeExtension, files, buildText]);

    return {submit, disabled};
}
