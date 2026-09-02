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

// Minimal structural shapes that both the WatermelonDB models and the query
// observers satisfy. Selection (group/field/value/delete_at) is handled by the
// scoped queries in @queries/servers/properties; these helpers only map the
// selected records to a banner view model.
type ClassificationField = Pick<PropertyFieldModel, 'id' | 'name' | 'objectType' | 'attrs'>;
type ClassificationValue = Pick<PropertyValueModel, 'fieldId' | 'value'>;

const hiddenState: ClassificationBannerState = {visible: false, levelName: '', color: ''};

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

// The per-channel banner is no longer classification's: any attribute designated
// for banner display produces one. See deriveChannelAttributeBanner in
// @utils/channel_attributes, which selects by attrs.actions and keeps a
// name-based fallback for classification fields that predate any configuration.
