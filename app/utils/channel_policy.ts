// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessage, type IntlShape} from 'react-intl';

import {ServerErrors} from '@constants';
import RenderPermissionsStore from '@store/render_permissions_store';
import {getServerError} from '@utils/errors';

export type ChannelPolicyDenial = 'write' | 'management';

export const writeDeniedMessage = defineMessage({
    id: 'mobile.create_post.write_access_denied',
    defaultMessage: 'You do not have permission to post in this channel.',
});

/**
 * The channel access policy the server refused a request under, if any.
 */
export function getChannelPolicyDenial(error: unknown): ChannelPolicyDenial | undefined {
    switch (getServerError(error)) {
        case ServerErrors.CHANNEL_WRITE_ACCESS_DENIED:
            return 'write';
        case ServerErrors.CHANNEL_MANAGEMENT_ACCESS_DENIED:
            return 'management';
        default:
            return undefined;
    }
}

/**
 * A policy refusal means the control was rendered from a decision that was still loading or went
 * stale, so the channel's decisions are marked due for revalidation.
 */
export function expireChannelDecisionsOnDenial(serverUrl: string, channelId: string, error: unknown) {
    if (getChannelPolicyDenial(error)) {
        RenderPermissionsStore.expireEntry(serverUrl, channelId);
    }
}

/**
 * The message for a write a channel policy refused. Management refusals have none: the alerts for those
 * actions already show the server's own message.
 */
export function writeDenialMessage(intl: IntlShape, error: unknown): string | undefined {
    return getChannelPolicyDenial(error) === 'write' ? intl.formatMessage(writeDeniedMessage) : undefined;
}
