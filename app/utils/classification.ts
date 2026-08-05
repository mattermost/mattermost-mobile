// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CLASSIFICATIONS_FIELD_NAME,
    CLASSIFICATIONS_SYSTEM_OBJECT_TYPE,
    DISPLAY_BANNER_TOP,
} from '@constants/classification';

import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';

export type ClassificationBannerState = {
    visible: boolean;
    levelName: string;
    color: string;
};

export type ChannelClassificationBannerState = {
    hasClassification: boolean;
    classificationBanner: ChannelBannerInfo | undefined;
};

// Minimal structural shapes that both the WatermelonDB models and the query
// observers satisfy. Selection (group/field/value/delete_at) is handled by the
// scoped queries in @queries/servers/properties; these helpers only map the
// selected records to a banner view model.
type ClassificationField = Pick<PropertyFieldModel, 'id' | 'name' | 'objectType' | 'attrs'>;
type ClassificationValue = Pick<PropertyValueModel, 'fieldId' | 'value'>;

const hiddenState: ClassificationBannerState = {visible: false, levelName: '', color: ''};

const noClassification: ChannelClassificationBannerState = {
    hasClassification: false,
    classificationBanner: undefined,
};

export function deriveClassificationBannerState(
    fields: ClassificationField[],
    systemValues: ClassificationValue[],
): ClassificationBannerState {
    const systemField = fields.find(
        (f) => f.objectType === CLASSIFICATIONS_SYSTEM_OBJECT_TYPE &&
               f.name === CLASSIFICATIONS_FIELD_NAME,
    );

    if (!systemField) {
        return hiddenState;
    }

    const actions = (systemField.attrs?.actions as string[] | undefined) ?? [];
    if (!actions.includes(DISPLAY_BANNER_TOP)) {
        return hiddenState;
    }

    const systemValue = systemValues.find((v) => v.fieldId === systemField.id);
    const optionId = (systemValue?.value as string | undefined) ?? '';
    if (!optionId) {
        return hiddenState;
    }

    const options = (systemField.attrs?.options as PropertyFieldOption[] | undefined) ?? [];
    const levelOption = options.find((o) => o.id === optionId);

    return {
        visible: Boolean(levelOption?.name),
        levelName: levelOption?.name ?? '',
        color: levelOption?.color ?? '',
    };
}

export function deriveChannelClassificationBanner(
    fields: ClassificationField[],
    channelValues: ClassificationValue[],
    nativeBannerText?: string,
): ChannelClassificationBannerState {
    const channelValue = channelValues.length > 0 ? channelValues[0] : undefined;
    const classificationId = channelValue?.value;
    if (typeof classificationId !== 'string' || !classificationId) {
        return noClassification;
    }

    const fieldWithOptions = fields.find((f) => (f.attrs?.options as PropertyFieldOption[] | undefined)?.length);
    const options = (fieldWithOptions?.attrs?.options as PropertyFieldOption[] | undefined) ?? [];
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
