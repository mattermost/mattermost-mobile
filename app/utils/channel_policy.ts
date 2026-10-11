// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessage, type IntlShape} from 'react-intl';

import {ServerErrors} from '@constants';
import RenderPermissionsStore from '@store/render_permissions_store';
import {getServerError} from '@utils/errors';

export type ChannelPolicyDenial = 'write' | 'management';
export type DmGmPolicyDenial = 'start' | 'read' | 'write';

export const writeDeniedMessage = defineMessage({
    id: 'mobile.create_post.write_access_denied',
    defaultMessage: 'You do not have permission to post in this channel.',
});

export const dmGmWriteDeniedMessage = defineMessage({
    id: 'mobile.create_post.dm_gm_write_access_denied',
    defaultMessage: 'You do not have permission to send direct or group messages.',
});

export const dmGmStartDeniedMessage = defineMessage({
    id: 'mobile.direct_message.start_denied',
    defaultMessage: 'You can\'t start new direct or group messages.',
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
 * The direct and group message policy the server refused a request under, if any.
 */
export function getDmGmPolicyDenial(error: unknown): DmGmPolicyDenial | undefined {
    switch (getServerError(error)) {
        case ServerErrors.DM_GM_START_DENIED:
            return 'start';
        case ServerErrors.DM_GM_READ_ACCESS_DENIED:
            return 'read';
        case ServerErrors.DM_GM_WRITE_ACCESS_DENIED:
            return 'write';
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
 * The message for a write a channel or DM/GM policy refused. Management refusals have none: the alerts
 * for those actions already show the server's own message.
 */
export function writeDenialMessage(intl: IntlShape, error: unknown): string | undefined {
    if (getDmGmPolicyDenial(error) === 'write') {
        return intl.formatMessage(dmGmWriteDeniedMessage);
    }
    return getChannelPolicyDenial(error) === 'write' ? intl.formatMessage(writeDeniedMessage) : undefined;
}
