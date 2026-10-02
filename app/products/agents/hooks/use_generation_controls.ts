// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';

import {regenerateResponse, stopGeneration} from '@agents/actions/remote/generation_controls';
import streamingStore from '@agents/store/streaming_store';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {showSnackBar} from '@utils/snack_bar';

type Options = {
    beforeRegenerate?: () => void;
    onRegenerateError?: () => void;
};

/**
 * Stop and regenerate handlers shared by the agent post renderers.
 */
export function useGenerationControls(postId: string, {beforeRegenerate, onRegenerateError}: Options = {}) {
    const serverUrl = useServerUrl();

    const stop = useCallback(async () => {
        // Mark stopped first so late `next` events are ignored before the
        // server's cancel/end lands.
        streamingStore.markStopped(serverUrl, postId);
        const {error} = await stopGeneration(serverUrl, postId);
        if (error) {
            showSnackBar({barType: SNACK_BAR_TYPE.AGENT_STOP_ERROR});
        }
    }, [serverUrl, postId]);

    const regenerate = useCallback(async () => {
        beforeRegenerate?.();

        // startStreaming preserves early buffers, so leftover state from the
        // previous stream would resurface the old answer.
        streamingStore.removePost(serverUrl, postId);
        const {error} = await regenerateResponse(serverUrl, postId);
        if (error) {
            onRegenerateError?.();
            showSnackBar({barType: SNACK_BAR_TYPE.AGENT_REGENERATE_ERROR});
        }
    }, [serverUrl, postId, beforeRegenerate, onRegenerateError]);

    return {stop, regenerate};
}
