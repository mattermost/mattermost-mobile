// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useMemo, useReducer} from 'react';

import {fetchClassificationBanner} from '@actions/remote/classification';
import {
    CLASSIFICATIONS_GROUP_NAME,
    CLASSIFICATIONS_SYSTEM_FIELD_NAME,
    CLASSIFICATIONS_SYSTEM_OBJECT_TYPE,
    CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
    CLASSIFICATIONS_TEMPLATE_FIELD_NAME,
    CLASSIFICATIONS_TEMPLATE_OBJECT_TYPE,
    DISPLAY_BANNER_TOP,
} from '@constants/classification';
import {getGroupIdByName, getPropertyFields, getPropertyValuesForTarget, registerGroupName, subscribe} from '@store/system_property_store';

export type ClassificationBannerState = {
    visible: boolean;
    levelName: string;
    color: string;
};

const hiddenState: ClassificationBannerState = {visible: false, levelName: '', color: ''};

const isClassificationField = (f: {name: string}) => f.name === CLASSIFICATIONS_TEMPLATE_FIELD_NAME || f.name === CLASSIFICATIONS_SYSTEM_FIELD_NAME;

export function useClassificationBannerState(serverUrl: string): ClassificationBannerState {
    const [renderCount, forceRender] = useReducer((x: number) => x + 1, 0);

    useEffect(() => {
        const unsub = subscribe((url, _groupId) => {
            if (url !== serverUrl) {
                return;
            }

            const resolvedId = getGroupIdByName(serverUrl, CLASSIFICATIONS_GROUP_NAME);
            if (resolvedId && resolvedId === _groupId) {
                forceRender();
                return;
            }

            if (!resolvedId) {
                const fields = getPropertyFields(serverUrl, _groupId);
                if (fields.some(isClassificationField)) {
                    registerGroupName(serverUrl, CLASSIFICATIONS_GROUP_NAME, _groupId);
                    forceRender();
                }
            }
        });
        return unsub;
    }, [serverUrl]);

    const groupId = getGroupIdByName(serverUrl, CLASSIFICATIONS_GROUP_NAME) ?? '';
    const fields = groupId ? getPropertyFields(serverUrl, groupId) : [];
    const values = groupId ? getPropertyValuesForTarget(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID) : [];

    const templateField = fields.find(
        (f) => f.object_type === CLASSIFICATIONS_TEMPLATE_OBJECT_TYPE && f.name === CLASSIFICATIONS_TEMPLATE_FIELD_NAME && f.delete_at === 0,
    );
    const linkedField = fields.find(
        (f) => f.object_type === CLASSIFICATIONS_SYSTEM_OBJECT_TYPE && f.name === CLASSIFICATIONS_SYSTEM_FIELD_NAME && f.linked_field_id && f.delete_at === 0,
    );
    const systemValue = linkedField ? values.find((v) => v.field_id === linkedField.id && v.delete_at === 0) : undefined;

    useEffect(() => {
        if (!templateField || !linkedField || (linkedField && !systemValue)) {
            fetchClassificationBanner(serverUrl);
        }
    }, [serverUrl, templateField, linkedField, systemValue]);

    return useMemo(() => {
        if (!groupId || !templateField || !linkedField) {
            return hiddenState;
        }

        const actions = (linkedField.attrs?.actions as string[] | undefined) ?? [];
        if (!actions.includes(DISPLAY_BANNER_TOP)) {
            return hiddenState;
        }

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
    }, [serverUrl, renderCount, groupId, templateField, linkedField, systemValue]);
}
