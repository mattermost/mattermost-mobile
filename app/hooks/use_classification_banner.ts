// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useMemo, useReducer} from 'react';

import {
    DISPLAY_BANNER_TOP,
    FIELD_NAME,
    GROUP_NAME,
    LINKED_FIELD_NAME,
    LINKED_OBJECT_TYPE,
    OBJECT_TYPE,
} from '@constants/classification';
import {getGroupIdByName, getPropertyFields, getSystemPropertyValues, subscribe} from '@store/system_property_store';

export type ClassificationBannerState = {
    visible: boolean;
    levelName: string;
    color: string;
};

const hiddenState: ClassificationBannerState = {visible: false, levelName: '', color: ''};

export function useClassificationBannerState(serverUrl: string): ClassificationBannerState {
    const [renderCount, forceRender] = useReducer((x: number) => x + 1, 0);

    useEffect(() => {
        const unsub = subscribe((url, _groupId) => {
            if (url === serverUrl) {
                const resolvedId = getGroupIdByName(serverUrl, GROUP_NAME);
                if (resolvedId && resolvedId === _groupId) {
                    forceRender();
                }
            }
        });
        return unsub;
    }, [serverUrl]);

    return useMemo(() => {
        const groupId = getGroupIdByName(serverUrl, GROUP_NAME) ?? '';
        if (!groupId) {
            return hiddenState;
        }

        const fields = getPropertyFields(serverUrl, groupId);
        const values = getSystemPropertyValues(serverUrl, groupId);

        const templateField = fields.find(
            (f) => f.object_type === OBJECT_TYPE && f.name === FIELD_NAME && f.delete_at === 0,
        );
        const linkedField = fields.find(
            (f) => f.object_type === LINKED_OBJECT_TYPE && f.name === LINKED_FIELD_NAME && f.linked_field_id && f.delete_at === 0,
        );

        if (!templateField || !linkedField) {
            return hiddenState;
        }

        const actions = (linkedField.attrs?.actions as string[] | undefined) ?? [];
        if (!actions.includes(DISPLAY_BANNER_TOP)) {
            return hiddenState;
        }

        const systemValue = values.find((v) => v.field_id === linkedField.id && v.delete_at === 0);
        const optionId = systemValue?.value ?? '';

        if (!optionId) {
            return hiddenState;
        }

        const options = (linkedField.attrs?.options as PropertyFieldOption[]) ?? [];
        const levelOption = options.find((o) => o.id === optionId);

        return {
            visible: Boolean(levelOption?.name),
            levelName: levelOption?.name ?? '',
            color: levelOption?.color ?? '',
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverUrl, renderCount]);
}
