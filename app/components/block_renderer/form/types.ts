// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/** Value stored for a form input field (keyed by field `name`). */
export type MmFormValue = string | string[] | boolean | number | null;

export type MmBlocksFormValues = Record<string, MmFormValue>;
export type MmBlocksFormErrors = Record<string, string>;

/** Absolute replace or functional update (same shape as React setState). */
export type MmBlocksFormErrorsChange = (
    errors: MmBlocksFormErrors | ((prev: MmBlocksFormErrors) => MmBlocksFormErrors),
) => void;

export type MmBlocksFormContextValue = {
    values: MmBlocksFormValues;
    getValue: (name: string) => MmFormValue | undefined;

    /** Latest values map (ref-backed; safe to call from another screen). */
    getValues: () => MmBlocksFormValues;
    setValue: (name: string, value: MmFormValue) => void;

    /** Seeds a field only if it has not been set yet (survives block re-translation). */
    setDefaultValue: (name: string, value: MmFormValue) => void;

    /** Server/integration field errors keyed by input `name`. */
    errors: MmBlocksFormErrors;

    /** Latest errors map (ref-backed; safe to call from another screen). */
    getErrors: () => MmBlocksFormErrors;
    setErrors: (errors: MmBlocksFormErrors) => void;
    clearError: (name: string) => void;
};

/**
 * Cross-screen form API for expanded scrollable content.
 * Getters must be ref-backed so they stay fresh after the host re-renders.
 * `resync` is registered by RelayedMmBlocksForm so host actions can refresh local UI.
 */
export type MmBlocksFormRelayApi = {
    getValues: () => MmBlocksFormValues;
    getErrors: () => MmBlocksFormErrors;
    setValue: (name: string, value: MmFormValue) => void;
    setDefaultValue: (name: string, value: MmFormValue) => void;
    setErrors: (errors: MmBlocksFormErrors) => void;
    clearError: (name: string) => void;
    resync?: () => void;
};

/** Build a relay API from a live form context value. */
export function createMmBlocksFormRelayApi(form: MmBlocksFormContextValue): MmBlocksFormRelayApi {
    return {
        getValues: form.getValues,
        getErrors: form.getErrors,
        setValue: form.setValue,
        setDefaultValue: form.setDefaultValue,
        setErrors: form.setErrors,
        clearError: form.clearError,
    };
}

/** Flatten typed form values into the string map legacy Interactive Dialog submissions require. */
export function formValuesToDialogSubmission(values: MmBlocksFormValues): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
        if (value === null || value === undefined) {
            continue;
        }
        if (Array.isArray(value)) {
            out[key] = value.join(',');
        } else {
            out[key] = String(value);
        }
    }
    return out;
}
