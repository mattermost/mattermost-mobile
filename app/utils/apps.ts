// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppBindingLocations, AppCallResponseTypes, AppFieldTypes} from '@constants/apps';

import {generateId} from './general';
import {isArrayOf, isStringArray} from './types';

export function cleanBinding(binding: AppBinding, topLocation: string): AppBinding|null {
    return cleanBindingRec(binding, topLocation, 0);
}

function cleanBindingRec(binding: AppBinding, topLocation: string, depth: number): AppBinding|null {
    if (!binding) {
        return null;
    }

    const toRemove: number[] = [];
    const usedLabels: {[label: string]: boolean} = {};
    binding.bindings?.forEach((b, i) => {
        // Inheritance and defaults
        if (!b.app_id) {
            b.app_id = binding.app_id;
        }

        if (!b.label) {
            b.label = binding.label || b.location || '';
        }

        if (!b.location) {
            b.location = generateId();
        }

        b.location = binding.location + '/' + b.location;

        // Validation
        if (!b.app_id) {
            toRemove.unshift(i);
            return;
        }

        // No empty labels nor "whitespace" labels
        if (!b.label.trim()) {
            toRemove.unshift(i);
            return;
        }

        switch (topLocation) {
            case AppBindingLocations.COMMAND: {
                if (b.label.match(/ |\t/)) {
                    toRemove.unshift(i);
                    return;
                }

                if (usedLabels[b.label]) {
                    toRemove.unshift(i);
                    return;
                }
                break;
            }
            case AppBindingLocations.IN_POST: {
                if (usedLabels[b.label]) {
                    toRemove.unshift(i);
                    return;
                }
                break;
            }
        }

        // Must have only subbindings, a form or a submit call.
        const hasBindings = Boolean(b.bindings?.length);
        const hasForm = Boolean(b.form);
        const hasSubmit = Boolean(b.submit);
        if ((!hasBindings && !hasForm && !hasSubmit) ||
            (hasBindings && hasForm) ||
            (hasBindings && hasSubmit) ||
            (hasForm && hasSubmit)) {
            toRemove.unshift(i);
            return;
        }

        if (hasBindings) {
            cleanBindingRec(b, topLocation, depth + 1);

            // Remove invalid branches
            if (!b.bindings?.length) {
                toRemove.unshift(i);
                return;
            }
        } else if (hasForm) {
            if (!b.form?.submit && !b.form?.source) {
                toRemove.unshift(i);
                return;
            }

            cleanForm(b.form);
        }

        usedLabels[b.label] = true;
    });

    toRemove.forEach((i) => {
        binding.bindings?.splice(i, 1);
    });

    return binding;
}

export function validateBindings(bindings: AppBinding[] = []): AppBinding[] {
    const channelHeaderBindings = bindings?.filter((b) => b.location === AppBindingLocations.CHANNEL_HEADER_ICON);
    const postMenuBindings = bindings?.filter((b) => b.location === AppBindingLocations.POST_MENU_ITEM);
    const commandBindings = bindings?.filter((b) => b.location === AppBindingLocations.COMMAND);

    channelHeaderBindings.forEach((b) => cleanBinding(b, AppBindingLocations.CHANNEL_HEADER_ICON));
    postMenuBindings.forEach((b) => cleanBinding(b, AppBindingLocations.POST_MENU_ITEM));
    commandBindings.forEach((b) => cleanBinding(b, AppBindingLocations.COMMAND));

    const hasBindings = (b: AppBinding) => b.bindings?.length;
    return postMenuBindings.filter(hasBindings).concat(channelHeaderBindings.filter(hasBindings), commandBindings.filter(hasBindings));
}

export function cleanForm(form?: AppForm): void {
    if (!form) {
        return;
    }

    const toRemove: number[] = [];
    const usedLabels: {[label: string]: boolean} = {};
    form.fields?.forEach((field, i) => {
        if (!field.name) {
            toRemove.unshift(i);
            return;
        }

        if (field.name.match(/ |\t/)) {
            toRemove.unshift(i);
            return;
        }

        let label = field.label;
        if (!label) {
            label = field.name;
        }

        if (label.match(/ |\t/)) {
            toRemove.unshift(i);
            return;
        }

        if (usedLabels[label]) {
            toRemove.unshift(i);
            return;
        }

        switch (field.type) {
            case AppFieldTypes.STATIC_SELECT:
                cleanStaticSelect(field);
                if (!field.options?.length) {
                    toRemove.unshift(i);
                    return;
                }
                break;
            case AppFieldTypes.DYNAMIC_SELECT:
                if (!field.lookup) {
                    toRemove.unshift(i);
                    return;
                }
        }

        usedLabels[label] = true;
    });

    toRemove.forEach((i) => {
        form.fields!.splice(i, 1);
    });
}

function cleanStaticSelect(field: AppField): void {
    const toRemove: number[] = [];
    const usedLabels: {[label: string]: boolean} = {};
    const usedValues: {[label: string]: boolean} = {};
    field.options?.forEach((option, i) => {
        let label = option.label;
        if (!label) {
            label = option.value;
        }

        if (!label) {
            toRemove.unshift(i);
            return;
        }

        let value = option.value;
        if (!value) {
            value = option.label;
        }

        if (!value) {
            toRemove.unshift(i);
            return;
        }

        if (usedLabels[label]) {
            toRemove.unshift(i);
            return;
        }

        if (usedValues[value]) {
            toRemove.unshift(i);
            return;
        }

        usedLabels[label] = true;
        usedValues[value] = true;
    });

    toRemove.forEach((i) => {
        field.options?.splice(i, 1);
    });
}

export function createCallContext(
    appID: string,
    location?: string,
    channelID?: string,
    teamID?: string,
    postID?: string,
    rootID?: string,
): AppContext {
    return {
        app_id: appID,
        location,
        channel_id: channelID,
        team_id: teamID,
        post_id: postID,
        root_id: rootID,
    };
}

export function createCallRequest(
    call: AppCall,
    context: AppContext,
    defaultExpand: AppExpand = {},
    values?: AppCallValues,
    rawCommand?: string,
): AppCallRequest {
    return {
        ...call,
        context,
        values,
        expand: {
            ...defaultExpand,
            ...call.expand,
        },
        raw_command: rawCommand,
    };
}

export const makeCallErrorResponse = <T=unknown>(errMessage: string): AppCallResponse<T> => {
    return {
        type: AppCallResponseTypes.ERROR,
        text: errMessage,
    };
};

export const filterEmptyOptions = (option: AppSelectOption): boolean => Boolean(option.value && !option.value.match(/^[ \t]+$/));

function isAppExpand(v: unknown): v is AppExpand {
    if (typeof v !== 'object' || v === null) {
        return false;
    }

    const expand = v as AppExpand;

    if (expand.app !== undefined && typeof expand.app !== 'string') {
        return false;
    }

    if (expand.acting_user !== undefined && typeof expand.acting_user !== 'string') {
        return false;
    }

    if (expand.channel !== undefined && typeof expand.channel !== 'string') {
        return false;
    }

    if (expand.config !== undefined && typeof expand.config !== 'string') {
        return false;
    }

    if (expand.mentioned !== undefined && typeof expand.mentioned !== 'string') {
        return false;
    }

    if (expand.parent_post !== undefined && typeof expand.parent_post !== 'string') {
        return false;
    }

    if (expand.post !== undefined && typeof expand.post !== 'string') {
        return false;
    }

    if (expand.root_post !== undefined && typeof expand.root_post !== 'string') {
        return false;
    }

    if (expand.team !== undefined && typeof expand.team !== 'string') {
        return false;
    }

    if (expand.user !== undefined && typeof expand.user !== 'string') {
        return false;
    }

    return true;
}

function isAppCall(obj: unknown): obj is AppCall {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    const call = obj as AppCall;

    if (call.path !== undefined && typeof call.path !== 'string') {
        return false;
    }

    if (call.expand !== undefined && !isAppExpand(call.expand)) {
        return false;
    }

    // Here we're assuming that 'state' can be of any type, so no type check for 'state'

    return true;
}

function isAppFormValue(v: unknown): v is AppFormValue {
    if (typeof v === 'string') {
        return true;
    }

    if (typeof v === 'boolean') {
        return true;
    }

    if (v === null) {
        return true;
    }

    return isAppSelectOption(v);
}

function isAppSelectOption(v: unknown): v is AppSelectOption {
    if (typeof v !== 'object' || v === null) {
        return false;
    }

    const option = v as AppSelectOption;

    if (option.label !== undefined && typeof option.label !== 'string') {
        return false;
    }

    if (option.value !== undefined && typeof option.value !== 'string') {
        return false;
    }

    if (option.icon_data !== undefined && typeof option.icon_data !== 'string') {
        return false;
    }

    return true;
}

function isAppField(v: unknown): v is AppField {
    if (typeof v !== 'object' || v === null) {
        return false;
    }

    const field = v as AppField;

    if (field.name !== undefined && typeof field.name !== 'string') {
        return false;
    }

    if (field.type !== undefined && typeof field.type !== 'string') {
        return false;
    }

    if (field.is_required !== undefined && typeof field.is_required !== 'boolean') {
        return false;
    }

    if (field.readonly !== undefined && typeof field.readonly !== 'boolean') {
        return false;
    }

    if (field.value !== undefined && !isAppFormValue(field.value)) {
        return false;
    }

    if (field.description !== undefined && typeof field.description !== 'string') {
        return false;
    }

    if (field.label !== undefined && typeof field.label !== 'string') {
        return false;
    }

    if (field.hint !== undefined && typeof field.hint !== 'string') {
        return false;
    }

    if (field.position !== undefined && typeof field.position !== 'number') {
        return false;
    }

    if (field.modal_label !== undefined && typeof field.modal_label !== 'string') {
        return false;
    }

    if (field.refresh !== undefined && typeof field.refresh !== 'boolean') {
        return false;
    }

    if (field.options !== undefined && !isArrayOf(field.options, isAppSelectOption)) {
        return false;
    }

    if (field.multiselect !== undefined && typeof field.multiselect !== 'boolean') {
        return false;
    }

    if (field.lookup !== undefined && !isAppCall(field.lookup)) {
        return false;
    }

    if (field.subtype !== undefined && typeof field.subtype !== 'string') {
        return false;
    }

    if (field.min_length !== undefined && typeof field.min_length !== 'number') {
        return false;
    }

    if (field.max_length !== undefined && typeof field.max_length !== 'number') {
        return false;
    }

    return true;
}

function isAppForm(v: unknown): v is AppForm {
    if (typeof v !== 'object' || v === null) {
        return false;
    }

    const form = v as AppForm;

    if (form.title !== undefined && typeof form.title !== 'string') {
        return false;
    }

    if (form.header !== undefined && typeof form.header !== 'string') {
        return false;
    }

    if (form.footer !== undefined && typeof form.footer !== 'string') {
        return false;
    }

    if (form.icon !== undefined && typeof form.icon !== 'string') {
        return false;
    }

    if (form.submit_buttons !== undefined && typeof form.submit_buttons !== 'string') {
        return false;
    }

    if (form.cancel_button !== undefined && typeof form.cancel_button !== 'boolean') {
        return false;
    }

    if (form.submit_on_cancel !== undefined && typeof form.submit_on_cancel !== 'boolean') {
        return false;
    }

    if (form.fields !== undefined && !isArrayOf(form.fields, isAppField)) {
        return false;
    }

    if (form.source !== undefined && !isAppCall(form.source)) {
        return false;
    }

    if (form.submit !== undefined && !isAppCall(form.submit)) {
        return false;
    }

    if (form.depends_on !== undefined && !isStringArray(form.depends_on)) {
        return false;
    }

    return true;
}

export function isAppBinding(obj: unknown): obj is AppBinding {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    const binding = obj as AppBinding;

    if (binding.app_id !== undefined && typeof binding.app_id !== 'string') {
        return false;
    }

    if (binding.label !== undefined && typeof binding.label !== 'string') {
        return false;
    }

    if (binding.location !== undefined && typeof binding.location !== 'string') {
        return false;
    }

    if (binding.icon !== undefined && typeof binding.icon !== 'string') {
        return false;
    }

    if (binding.hint !== undefined && typeof binding.hint !== 'string') {
        return false;
    }

    if (binding.description !== undefined && typeof binding.description !== 'string') {
        return false;
    }

    if (binding.role_id !== undefined && typeof binding.role_id !== 'string') {
        return false;
    }

    if (binding.depends_on_team !== undefined && typeof binding.depends_on_team !== 'boolean') {
        return false;
    }

    if (binding.depends_on_channel !== undefined && typeof binding.depends_on_channel !== 'boolean') {
        return false;
    }

    if (binding.depends_on_user !== undefined && typeof binding.depends_on_user !== 'boolean') {
        return false;
    }

    if (binding.depends_on_post !== undefined && typeof binding.depends_on_post !== 'boolean') {
        return false;
    }

    if (binding.bindings !== undefined && !isArrayOf(binding.bindings, isAppBinding)) {
        return false;
    }

    if (binding.form !== undefined && !isAppForm(binding.form)) {
        return false;
    }

    if (binding.submit !== undefined && !isAppCall(binding.submit)) {
        return false;
    }

    return true;
}
