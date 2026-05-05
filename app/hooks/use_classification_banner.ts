// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';

import {
    DISPLAY_BANNER_TOP,
    FIELD_NAME,
    GROUP_NAME,
    LINKED_FIELD_NAME,
    LINKED_OBJECT_TYPE,
    OBJECT_TYPE,
} from '@constants/classification';
import {usePropertyStoreGroup} from '@store/system_property_store';

export type ClassificationBannerState = {
    visible: boolean;
    levelName: string;
    color: string;
};

export function useClassificationBannerState(serverUrl: string): ClassificationBannerState {
    const {fields, values} = usePropertyStoreGroup(serverUrl, GROUP_NAME);

    return useMemo(() => {
        const templateField = fields.find(
            (f) => f.object_type === OBJECT_TYPE && f.name === FIELD_NAME && f.delete_at === 0,
        );
        const linkedField = fields.find(
            (f) => f.object_type === LINKED_OBJECT_TYPE && f.name === LINKED_FIELD_NAME && f.linked_field_id && f.delete_at === 0,
        );

        if (!templateField || !linkedField) {
            return {visible: false, levelName: '', color: ''};
        }

        const actions = (linkedField.attrs?.actions as string[] | undefined) ?? [];
        if (!actions.includes(DISPLAY_BANNER_TOP)) {
            return {visible: false, levelName: '', color: ''};
        }

        const systemValue = values.find((v) => v.field_id === linkedField.id);
        const optionId = systemValue?.value ?? '';

        if (!optionId) {
            return {visible: false, levelName: '', color: ''};
        }

        const options = (linkedField.attrs?.options as PropertyFieldOption[]) ?? [];
        const levelOption = options.find((o) => o.id === optionId);

        return {
            visible: Boolean(levelOption?.name),
            levelName: levelOption?.name ?? '',
            color: levelOption?.color ?? '',
        };
    }, [fields, values]);
}
