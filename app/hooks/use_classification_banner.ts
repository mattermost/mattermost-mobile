// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useMemo, useReducer} from 'react';

import {fetchClassificationBanner} from '@actions/remote/classification';
import {
    DISPLAY_BANNER_TOP,
    FIELD_NAME,
    GROUP_NAME,
    LINKED_FIELD_NAME,
    LINKED_OBJECT_TYPE,
    OBJECT_TYPE,
} from '@constants/classification';
import {getGroupIdByName, getPropertyFields, getSystemPropertyValues, registerGroupName, subscribe} from '@store/system_property_store';

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
            if (url !== serverUrl) {
                return;
            }

            const resolvedId = getGroupIdByName(serverUrl, GROUP_NAME);
            if (resolvedId && resolvedId === _groupId) {
                forceRender();
                return;
            }

            if (!resolvedId) {
                const fields = getPropertyFields(serverUrl, _groupId);
                const isClassificationGroup = fields.some(
                    (f) => f.name === FIELD_NAME || f.name === LINKED_FIELD_NAME,
                );
                if (isClassificationGroup) {
                    registerGroupName(serverUrl, GROUP_NAME, _groupId);
                    forceRender();
                }
            }
        });
        return unsub;
    }, [serverUrl]);

    const groupId = getGroupIdByName(serverUrl, GROUP_NAME) ?? '';
    const fields = groupId ? getPropertyFields(serverUrl, groupId) : [];
    const values = groupId ? getSystemPropertyValues(serverUrl, groupId) : [];

    const templateField = fields.find(
        (f) => f.object_type === OBJECT_TYPE && f.name === FIELD_NAME && f.delete_at === 0,
    );
    const linkedField = fields.find(
        (f) => f.object_type === LINKED_OBJECT_TYPE && f.name === LINKED_FIELD_NAME && f.linked_field_id && f.delete_at === 0,
    );
    const systemValue = linkedField ? values.find((v) => v.field_id === linkedField.id && v.delete_at === 0) : undefined;

    // Bootstrap a fetch when expected data is missing.
    // This handles cases where classification was enabled while the app was running,
    // or where the initial reconnect fetch happened before the configuration existed.
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
