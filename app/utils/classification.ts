// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CLASSIFICATIONS_CHANNEL_FIELD_NAME,
    CLASSIFICATIONS_GROUP_NAME,
    CLASSIFICATIONS_SYSTEM_FIELD_NAME,
    CLASSIFICATIONS_SYSTEM_OBJECT_TYPE,
    CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
    DISPLAY_BANNER_TOP,
} from '@constants/classification';

export type ClassificationBannerState = {
    visible: boolean;
    levelName: string;
    color: string;
};

export type ChannelClassificationBannerState = {
    hasClassification: boolean;
    classificationBanner: ChannelBannerInfo | undefined;
};

const hiddenState: ClassificationBannerState = {visible: false, levelName: '', color: ''};

const noClassification: ChannelClassificationBannerState = {
    hasClassification: false,
    classificationBanner: undefined,
};

const isClassificationField = (f: PropertyField) =>
    f.name === CLASSIFICATIONS_SYSTEM_FIELD_NAME || f.name === CLASSIFICATIONS_CHANNEL_FIELD_NAME;

export function resolveGroupId(
    fieldsByGroup: Record<string, PropertyField[]>,
    groupNames: Record<string, string>,
): [string, PropertyField[]] {
    const mappedId = groupNames[CLASSIFICATIONS_GROUP_NAME] ?? '';
    if (mappedId) {
        return [mappedId, fieldsByGroup[mappedId] ?? []];
    }

    for (const [gid, gfields] of Object.entries(fieldsByGroup)) {
        if (gfields.some(isClassificationField)) {
            return [gid, gfields];
        }
    }

    return ['', []];
}

export function deriveClassificationBannerState(
    fieldsByGroup: Record<string, PropertyField[]>,
    valuesByTarget: Record<string, Array<PropertyValue<string>>>,
    groupNames: Record<string, string>,
): ClassificationBannerState {
    const [groupId, fields] = resolveGroupId(fieldsByGroup, groupNames);
    if (!groupId) {
        return hiddenState;
    }

    const systemField = fields.find(
        (f) => f.object_type === CLASSIFICATIONS_SYSTEM_OBJECT_TYPE &&
               f.name === CLASSIFICATIONS_SYSTEM_FIELD_NAME &&
               f.linked_field_id &&
               f.delete_at === 0,
    );

    if (!systemField) {
        return hiddenState;
    }

    const actions = (systemField.attrs?.actions as string[] | undefined) ?? [];
    if (!actions.includes(DISPLAY_BANNER_TOP)) {
        return hiddenState;
    }

    const values = valuesByTarget[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID] ?? [];
    const systemValue = values.find((v) => v.field_id === systemField.id && v.delete_at === 0);
    const optionId = systemValue?.value ?? '';
    if (!optionId) {
        return hiddenState;
    }

    const options = (systemField.attrs?.options as PropertyFieldOption[]) ?? [];
    const levelOption = options.find((o) => o.id === optionId);

    return {
        visible: Boolean(levelOption?.name),
        levelName: levelOption?.name ?? '',
        color: levelOption?.color ?? '',
    };
}

export function deriveChannelClassificationBanner(
    fieldsByGroup: Record<string, PropertyField[]>,
    valuesByTarget: Record<string, Array<PropertyValue<string>>>,
    groupNames: Record<string, string>,
    channelId: string,
    nativeBannerText?: string,
): ChannelClassificationBannerState {
    const [, fields] = resolveGroupId(fieldsByGroup, groupNames);

    const channelValues = channelId ? (valuesByTarget[channelId] ?? []) : [];
    const channelValue = channelValues.length > 0 ? channelValues[0] : undefined;

    if (!channelValue?.value || channelValue.delete_at !== 0) {
        return noClassification;
    }

    const classificationId = channelValue.value;
    if (typeof classificationId !== 'string') {
        return noClassification;
    }

    const fieldWithOptions = fields.find((f) => (f.attrs?.options as PropertyFieldOption[] | undefined)?.length);
    const options = (fieldWithOptions?.attrs?.options as PropertyFieldOption[]) ?? [];
    const level = options.find((o) => o.id === classificationId);
    if (!level) {
        return noClassification;
    }

    const bannerText = nativeBannerText ?? `**${level.name}**`;

    return {
        hasClassification: true,
        classificationBanner: {
            enabled: true,
            text: bannerText,
            background_color: level.color,
        },
    };
}
