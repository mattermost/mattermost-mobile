// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Converts a legacy Interactive Dialog (elements/introduction_text/submit_label) into mm_blocks
// so BlockRenderer can render it. Ported from webapp utils/dialog_to_mm_blocks.ts; mobile has no
// element-level validation pass, so errors is always empty.

import {DialogElementTypes} from '@utils/dialog_utils';

/** Synthetic action id for the dialog submit button (legacy Interactive Dialog path). */
export const DIALOG_SUBMIT_ACTION_ID = 'dialog_submit';

export type DialogToMmBlocksResult = {
    blocks: MmBlock[];
    errors: string[];
};

function boolDefault(value: string | boolean | undefined): boolean | undefined {
    if (value === undefined || value === '') {
        return undefined;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === 'yes' || lower === '1') {
        return true;
    }
    if (lower === 'false' || lower === 'no' || lower === '0') {
        return false;
    }
    return undefined;
}

function stringDefault(value: string | boolean | undefined): string | undefined {
    if (typeof value !== 'string' || !value) {
        return undefined;
    }
    return value;
}

function selectOptions(element: DialogElement): MmStaticSelectOption[] | undefined {
    if (!element.options?.length) {
        return undefined;
    }
    return element.options.map((opt) => ({
        text: String(opt.text ?? ''),
        value: String(opt.value ?? ''),
    }));
}

function textSubtype(subtype: string | undefined): MmTextInputSubtype | undefined {
    if (!subtype) {
        return undefined;
    }
    switch (subtype) {
        case 'email':
        case 'number':
        case 'password':
        case 'tel':
        case 'url':
            return subtype;
        default:
            return 'text';
    }
}

/** Map dialog date/datetime constraints into mm_blocks datetime_config. */
function toMmDateTimeConfig(element: DialogElement): MmDateTimeConfig | undefined {
    const cfg = element.datetime_config;
    const minDate = element.min_date || undefined;
    const maxDate = element.max_date || undefined;
    const timeInterval = cfg?.time_interval || element.time_interval || undefined;
    const locationTimezone = cfg?.location_timezone || undefined;

    // Dialog/Apps API uses allow_manual_time_entry; mm_blocks uses manual_time_entry.
    const manualTimeEntry = cfg?.allow_manual_time_entry;

    if (!minDate && !maxDate && !timeInterval && !locationTimezone && manualTimeEntry === undefined) {
        return undefined;
    }

    return {
        ...(minDate ? {min_date: minDate} : {}),
        ...(maxDate ? {max_date: maxDate} : {}),
        ...(timeInterval ? {time_interval: timeInterval} : {}),
        ...(locationTimezone ? {location_timezone: locationTimezone} : {}),
        ...(manualTimeEntry === undefined ? {} : {manual_time_entry: manualTimeEntry}),
    };
}

/**
 * Convert a single DialogElement into an mm_blocks form/control block.
 * Returns null when the element cannot be converted.
 */
export function convertDialogElementToMmBlock(element: DialogElement): MmBlock | null {
    if (!element?.name || !element.type) {
        return null;
    }

    const base = {
        name: String(element.name),
        label: String(element.display_name || element.name),
        help_text: element.help_text ? String(element.help_text) : undefined,
        optional: Boolean(element.optional),
        onChange: element.refresh ? String(element.name) : undefined,
    };

    switch (element.type) {
        case DialogElementTypes.TEXT:
            return {
                type: 'text_input',
                ...base,
                subtype: textSubtype(element.subtype),
                placeholder: element.placeholder || undefined,
                initial_value: stringDefault(element.default),
                min_length: element.min_length || undefined,
                max_length: element.max_length || undefined,
            };
        case DialogElementTypes.TEXTAREA:
            return {
                type: 'text_input',
                ...base,
                multiline: true,
                placeholder: element.placeholder || undefined,
                initial_value: stringDefault(element.default),
                min_length: element.min_length || undefined,
                max_length: element.max_length || undefined,
            };
        case DialogElementTypes.BOOL:
            return {
                type: 'bool_input',
                ...base,
                placeholder: element.placeholder || undefined,
                initial_value: boolDefault(element.default),
            };
        case DialogElementTypes.RADIO:
            return {
                type: 'select',
                ...base,
                style: 'expanded',
                options: selectOptions(element),
                initial_option: stringDefault(element.default),
                placeholder: element.placeholder || undefined,
            };
        case DialogElementTypes.SELECT: {
            const dataSource = element.data_source || undefined;
            const defaultValue = stringDefault(element.default);
            const block: MmBlock = {
                type: 'select',
                ...base,
                placeholder: element.placeholder || undefined,
                multiselect: element.multiselect || undefined,
                options: dataSource ? undefined : selectOptions(element),
                data_source: dataSource,
                data_source_action: dataSource === 'dynamic' ? String(element.name) : undefined,
                initial_option: defaultValue && !element.multiselect ? defaultValue : undefined,
                initial_options: element.multiselect && defaultValue ? defaultValue.split(',').map((v) => v.trim()).filter(Boolean) : undefined,
            };
            return block;
        }
        case DialogElementTypes.DATE:
            return {
                type: 'date_input',
                ...base,
                placeholder: element.placeholder || undefined,
                initial_value: stringDefault(element.default),
                datetime_config: toMmDateTimeConfig(element),
            };
        case DialogElementTypes.DATETIME:
            return {
                type: 'datetime_input',
                ...base,
                placeholder: element.placeholder || undefined,
                initial_value: stringDefault(element.default),
                datetime_config: toMmDateTimeConfig(element),
            };
        case DialogElementTypes.FILE:
            return {
                type: 'file_input',
                ...base,
                placeholder: element.placeholder || undefined,
                allow_multiple: element.allow_multiple || undefined,
            };
        case DialogElementTypes.ACTION_BUTTON:
            return {
                type: 'button',
                text: String(element.display_name || element.name),
                action_id: String(element.name),
                subtype: 'execute',
                query: {
                    ...(element.action_button?.context || {}),
                    __dialog_action_button: '1',
                    ...(element.action_button?.url ? {__dialog_action_url: element.action_button.url} : {}),
                },
            };
        default:
            return null;
    }
}

/**
 * Convert a legacy Interactive Dialog definition into mm_blocks for BlockRenderer.
 * Submit/cancel chrome belongs in the dialog footer (see BlocksDialogShell), not in blocks.
 */
export function convertDialogToMmBlocks(
    elements: DialogElement[] | undefined,
    introductionText: string | undefined,
): DialogToMmBlocksResult {
    const blocks: MmBlock[] = [];

    if (introductionText?.trim()) {
        blocks.push({
            type: 'text',
            text: String(introductionText),
        });
    }

    elements?.forEach((element) => {
        const block = convertDialogElementToMmBlock(element);
        if (block) {
            blocks.push(block);
        }
    });

    return {blocks, errors: []};
}

/**
 * Whether the dialog modal footer should show a Submit button.
 * Action-button-only dialogs omit Submit unless submit_label is set.
 */
export function dialogShouldShowSubmitChrome(
    elements: DialogElement[] | undefined,
    submitLabel: string | undefined,
): boolean {
    const hasFormFields = elements?.some((el) => el.type !== DialogElementTypes.ACTION_BUTTON) ?? false;
    const actionButtonsOnly = (elements?.length ?? 0) > 0 && !hasFormFields;
    return !actionButtonsOnly || Boolean(submitLabel);
}
