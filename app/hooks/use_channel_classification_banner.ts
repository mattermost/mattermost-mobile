// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useMemo, useReducer} from 'react';

import {fetchChannelClassificationValue} from '@actions/remote/classification';
import {
    CLASSIFICATIONS_CHANNEL_FIELD_NAME,
    CLASSIFICATIONS_CHANNEL_OBJECT_TYPE,
    CLASSIFICATIONS_GROUP_NAME,
    CLASSIFICATIONS_TEMPLATE_FIELD_NAME,
    CLASSIFICATIONS_TEMPLATE_OBJECT_TYPE,
} from '@constants/classification';
import {
    getGroupIdByName,
    getPropertyFields,
    getPropertyValueForField,
    subscribe,
} from '@store/system_property_store';

export type ChannelClassificationBannerState = {
    hasClassification: boolean;
    classificationBanner: ChannelBannerInfo | undefined;
};

const noClassification: ChannelClassificationBannerState = {
    hasClassification: false,
    classificationBanner: undefined,
};

/**
 * Resolves the effective classification banner for a channel.
 *
 * If a classification property value exists for this channel, returns
 * a ChannelBannerInfo derived from the classification level (color from
 * the template field's options, text from the channel's banner_info or
 * falling back to the level name).
 *
 * Consumers merge this with the native banner_info to decide what to render.
 */
export function useChannelClassificationBanner(
    serverUrl: string,
    channelId: string,
    nativeBannerInfo?: ChannelBannerInfo,
): ChannelClassificationBannerState {
    const [, forceRender] = useReducer((x: number) => x + 1, 0);

    useEffect(() => {
        const unsub = subscribe((url, _groupId) => {
            if (url !== serverUrl) {
                return;
            }
            const resolvedId = getGroupIdByName(serverUrl, CLASSIFICATIONS_GROUP_NAME);
            if (resolvedId && resolvedId === _groupId) {
                forceRender();
            }
        });
        return unsub;
    }, [serverUrl]);

    const groupId = getGroupIdByName(serverUrl, CLASSIFICATIONS_GROUP_NAME) ?? '';
    const fields = groupId ? getPropertyFields(serverUrl, groupId) : [];

    const templateField = fields.find(
        (f) => f.object_type === CLASSIFICATIONS_TEMPLATE_OBJECT_TYPE && f.name === CLASSIFICATIONS_TEMPLATE_FIELD_NAME && f.delete_at === 0,
    );
    const channelField = fields.find(
        (f) => f.object_type === CLASSIFICATIONS_CHANNEL_OBJECT_TYPE && f.name === CLASSIFICATIONS_CHANNEL_FIELD_NAME && f.linked_field_id && f.delete_at === 0,
    );

    const propertyValue = channelField && channelId
        ? getPropertyValueForField(serverUrl, channelId, channelField.id)
        : undefined;

    useEffect(() => {
        if (!channelId || !channelField) {
            return;
        }
        if (!propertyValue) {
            fetchChannelClassificationValue(serverUrl, channelId);
        }
    }, [serverUrl, channelId, channelField, propertyValue]);

    return useMemo((): ChannelClassificationBannerState => {
        if (!propertyValue?.value || !templateField || !channelField) {
            return noClassification;
        }

        const classificationId = propertyValue.value;
        if (typeof classificationId !== 'string') {
            return noClassification;
        }

        const options = (templateField.attrs?.options as PropertyFieldOption[]) ?? [];
        const level = options.find((o) => o.id === classificationId);
        if (!level) {
            return noClassification;
        }

        const bannerText = nativeBannerInfo?.text ?? `**${level.name}**`;

        return {
            hasClassification: true,
            classificationBanner: {
                enabled: true,
                text: bannerText,
                background_color: level.color,
            },
        };
    }, [propertyValue, templateField, channelField, nativeBannerInfo]);
}
