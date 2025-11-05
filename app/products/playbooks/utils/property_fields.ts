// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {safeParseJSON} from '@utils/helpers';
import {getSelectedOptionIds} from '@utils/user';

import type PlaybookRunPropertyFieldModel from '@playbooks/database/models/playbook_run_attribute';
import type PlaybookRunPropertyValueModel from '@playbooks/database/models/playbook_run_attribute_value';

type PropertyFieldAttrs = {
    options?: Array<{id: string; name: string}>;
    parent_id?: string;
    sort_order: number;
    value_type: string;
} | null;

export const parsePropertyFieldAttrs = (attrs?: string): PropertyFieldAttrs => {
    if (!attrs) {
        return null;
    }

    try {
        const parsed = safeParseJSON(attrs) as Record<string, unknown> | null | undefined;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const options = Array.isArray((parsed as any).options) ? (parsed as any).options as Array<{id: string; name: string}> : undefined;
        const parent_id = typeof (parsed as any).parent_id === 'string' ? (parsed as any).parent_id : undefined;
        const sort_order = typeof (parsed as any).sort_order === 'number' ? (parsed as any).sort_order : 999;
        const value_type = typeof (parsed as any).value_type === 'string' ? (parsed as any).value_type : '';

        return {options, parent_id, sort_order, value_type};
    } catch {
        return null;
    }
};

export const getPropertyFieldSortOrder = (propertyField: PlaybookRunPropertyFieldModel): number => {
    const attrs = parsePropertyFieldAttrs(propertyField.attrs);
    if (!attrs || typeof attrs.sort_order !== 'number') {
        return 999;
    }
    return attrs.sort_order;
};

export const sortPropertyFieldsByOrder = (propertyFields: PlaybookRunPropertyFieldModel[]): PlaybookRunPropertyFieldModel[] => {
    return [...propertyFields].sort((a, b) => getPropertyFieldSortOrder(a) - getPropertyFieldSortOrder(b));
};

export const formatPropertyFieldOptionsForSelector = (propertyField: PlaybookRunPropertyFieldModel): DialogOption[] => {
    if (propertyField.type !== 'select' && propertyField.type !== 'multiselect') {
        return [];
    }

    const attrs = parsePropertyFieldAttrs(propertyField.attrs);
    const options = attrs?.options;
    if (!options || !Array.isArray(options)) {
        return [];
    }

    return options.map((o) => ({text: o.name, value: o.id}));
};

export const getOptionNameById = (options: Array<{id: string; name: string}>, optionId: string): string => {
    const found = options.find((o) => o.id === optionId);
    return found ? found.name : optionId;
};

export const getPropertyValueDisplay = (
    propertyField: PlaybookRunPropertyFieldModel,
    value?: PlaybookRunPropertyValueModel,
): string => {
    if (!value) {
        return '';
    }

    const rawValue = value.value || '';

    if (propertyField.type === 'text') {
        return rawValue;
    }

    const attrs = parsePropertyFieldAttrs(propertyField.attrs);
    const options = attrs?.options || [];

    if (propertyField.type === 'select') {
        if (!rawValue) {
            return '';
        }
        return getOptionNameById(options, rawValue);
    }

    if (propertyField.type === 'multiselect') {
        const selectedIds = getSelectedOptionIds(rawValue, 'multiselect');
        if (!selectedIds.length) {
            return '';
        }
        const names = selectedIds.map((id) => getOptionNameById(options, id));
        return names.join(', ');
    }

    // Unknown type fallback
    return rawValue;
};

