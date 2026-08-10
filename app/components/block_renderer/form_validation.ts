// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    checkDateTimeFieldValue,
    dialogFieldErrorMessages,
    type DialogFieldError,
} from '@utils/integrations';

import type {MmBlocksFormValues, MmFormValue} from './form';

export type MmBlocksFormField =
    MmTextInputBlock |
    MmBoolInputBlock |
    MmSelectInputBlock |
    MmDateInputBlock |
    MmDateTimeInputBlock |
    MmFileInputBlock;

export type MmBlocksFormFieldError = DialogFieldError;

function isFormFieldBlock(block: MmBlock): block is MmBlocksFormField {
    switch (block.type) {
        case 'text_input':
        case 'bool_input':
        case 'select':
        case 'date_input':
        case 'datetime_input':
        case 'file_input':
            return true;
        default:
            return false;
    }
}

/** Depth-first collect of form input blocks from an mm_blocks tree. */
export function collectMmBlocksFormFields(blocks: MmBlock[]): MmBlocksFormField[] {
    const out: MmBlocksFormField[] = [];

    const visit = (block: MmBlock) => {
        if (isFormFieldBlock(block)) {
            out.push(block);
            return;
        }
        switch (block.type) {
            case 'container':
                block.content?.forEach(visit);
                break;
            case 'collapsible':
                block.header?.forEach(visit);
                block.content?.forEach(visit);
                break;
            case 'column':
                block.items?.forEach(visit);
                break;
            case 'column_set':
                block.columns?.forEach(visit);
                break;
            default:
                break;
        }
    };

    blocks.forEach(visit);
    return out;
}

/**
 * Removes form input blocks (and empty structural parents) from an mm_blocks tree.
 * Used when block actions are unavailable and the server cannot handle form inputs.
 */
export function stripMmBlocksFormInputs(blocks: MmBlock[]): MmBlock[] {
    return mapNonNull(blocks, stripMmBlockFormInputs);
}

function mapNonNull<T>(items: T[] | undefined, map: (item: T) => T | null): T[] {
    if (!items?.length) {
        return [];
    }
    const out: T[] = [];
    for (const item of items) {
        const next = map(item);
        if (next) {
            out.push(next);
        }
    }
    return out;
}

function stripMmBlockFormInputs(block: MmBlock): MmBlock | null {
    if (isFormFieldBlock(block)) {
        return null;
    }

    switch (block.type) {
        case 'container': {
            const content = mapNonNull(block.content, stripMmBlockFormInputs);
            if (!content.length) {
                return null;
            }
            return {...block, content};
        }
        case 'collapsible': {
            const header = mapNonNull(block.header, stripMmBlockFormInputs);
            const content = mapNonNull(block.content, stripMmBlockFormInputs);
            if (!header.length || !content.length) {
                return null;
            }
            return {...block, header, content};
        }
        case 'column': {
            const items = mapNonNull(block.items, stripMmBlockFormInputs);
            if (!items.length) {
                return null;
            }
            return {...block, items};
        }
        case 'column_set': {
            const columns: MmColumnBlock[] = [];
            for (const column of block.columns || []) {
                const next = stripMmBlockFormInputs(column);
                if (next?.type === 'column') {
                    columns.push(next);
                }
            }
            if (!columns.length) {
                return null;
            }
            return {...block, columns};
        }
        default:
            return block;
    }
}

function isEmptyFormValue(value: MmFormValue | undefined): boolean {
    if (value === undefined || value === null) {
        return true;
    }
    if (typeof value === 'boolean') {
        // Match web mm_blocks: unchecked (false) is still an explicit value.
        return false;
    }

    if (typeof value === 'number') {
        // Match interactive dialogs: 0 is a filled value; only non-finite is empty.
        return !Number.isFinite(value);
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    return value === '';
}

/**
 * Validate one mm_blocks form field (required, lengths, subtype, option, date format).
 * Mirrors checkDialogElementForError for the blocks form model.
 */
export function checkMmBlocksFormFieldForError(
    field: MmBlocksFormField,
    value: MmFormValue | undefined,
): MmBlocksFormFieldError | null {
    if (isEmptyFormValue(value)) {
        if (field.optional !== true) {
            return dialogFieldErrorMessages.required;
        }
        return null;
    }

    switch (field.type) {
        case 'text_input': {
            const stringValue = String(value);
            if (field.min_length !== undefined && stringValue.length < field.min_length) {
                return {
                    ...dialogFieldErrorMessages.tooShort,
                    values: {minLength: field.min_length},
                };
            }
            if (field.max_length !== undefined && field.max_length > 0 && stringValue.length > field.max_length) {
                return {
                    ...dialogFieldErrorMessages.tooLong,
                    values: {maxLength: field.max_length},
                };
            }
            if (field.subtype === 'email' && !stringValue.includes('@')) {
                return dialogFieldErrorMessages.badEmail;
            }
            if (field.subtype === 'number' && Number.isNaN(Number(stringValue))) {
                return dialogFieldErrorMessages.badNumber;
            }
            if (field.subtype === 'url' && !stringValue.startsWith('http://') && !stringValue.startsWith('https://')) {
                return dialogFieldErrorMessages.badUrl;
            }
            return null;
        }
        case 'select': {
            const options = field.options;
            if (!options?.length) {
                return null;
            }
            const selected = Array.isArray(value) ? value : [value];
            const invalid = selected.some((v) => !options.some((opt) => opt.value === v));
            if (invalid) {
                return dialogFieldErrorMessages.invalidOption;
            }
            return null;
        }
        case 'date_input':
        case 'datetime_input': {
            if (typeof value !== 'string') {
                return null;
            }
            const fieldType = field.type === 'date_input' ? 'date' : 'datetime';
            return checkDateTimeFieldValue(value, fieldType, {
                datetime_config: field.datetime_config,
            });
        }
        case 'file_input':
            if (Array.isArray(value) || typeof value === 'string') {
                return null;
            }
            return dialogFieldErrorMessages.invalidFile;
        default:
            return null;
    }
}

/** Validate all form fields in an mm_blocks tree; returns field-name → error descriptor. */
export function validateMmBlocksFormValues(
    blocks: MmBlock[],
    values: MmBlocksFormValues,
): Record<string, MmBlocksFormFieldError> {
    const errors: Record<string, MmBlocksFormFieldError> = {};
    for (const field of collectMmBlocksFormFields(blocks)) {
        if (!field.name) {
            continue;
        }
        const error = checkMmBlocksFormFieldForError(field, values[field.name]);
        if (error) {
            errors[field.name] = error;
        }
    }
    return errors;
}
