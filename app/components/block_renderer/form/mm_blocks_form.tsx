// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';

import {MmBlocksFormContext} from './context';

import type {MmBlocksFormContextValue, MmBlocksFormErrors, MmBlocksFormErrorsChange, MmBlocksFormValues, MmFormValue} from './types';

type MmBlocksFormProps = {
    children: ReactNode;

    /** Controlled field errors (e.g. from do-block-action `errors`). */
    errors: MmBlocksFormErrors;
    onErrorsChange: MmBlocksFormErrorsChange;
};

/**
 * Tracks form input values for mm_blocks and exposes them via context.
 * Wraps the root block container so input blocks can read/update their values.
 * Field errors are always controlled by the parent.
 */
export function MmBlocksForm({children, errors, onErrorsChange}: MmBlocksFormProps) {
    const [values, setValues] = useState<MmBlocksFormValues>({});
    const valuesRef = useRef(values);
    valuesRef.current = values;
    const errorsRef = useRef(errors);

    // Keep the ref aligned with controlled props without clobbering optimistic clearError/setErrors.
    useEffect(() => {
        errorsRef.current = errors;
    }, [errors]);

    const setErrors = useCallback((next: MmBlocksFormErrors) => {
        errorsRef.current = next;
        onErrorsChange(next);
    }, [onErrorsChange]);

    const clearError = useCallback((name: string) => {
        const prev = errorsRef.current;
        if (!Object.prototype.hasOwnProperty.call(prev, name)) {
            return;
        }
        const next = {...prev};
        delete next[name];
        errorsRef.current = next;
        onErrorsChange(next);
    }, [onErrorsChange]);

    const getValue = useCallback((name: string) => valuesRef.current[name], []);

    const getValues = useCallback(() => valuesRef.current, []);

    const getErrors = useCallback(() => errorsRef.current, []);

    const setValue = useCallback((name: string, value: MmFormValue) => {
        const prev = valuesRef.current;
        if (prev[name] !== value) {
            const next = {...prev, [name]: value};
            valuesRef.current = next;
            setValues(next);
        }
        clearError(name);
    }, [clearError]);

    const setDefaultValue = useCallback((name: string, value: MmFormValue) => {
        const prev = valuesRef.current;
        if (Object.prototype.hasOwnProperty.call(prev, name)) {
            return;
        }
        const next = {...prev, [name]: value};
        valuesRef.current = next;
        setValues(next);
    }, []);

    const contextValue = useMemo((): MmBlocksFormContextValue => ({
        values,
        getValue,
        getValues,
        setValue,
        setDefaultValue,
        errors,
        getErrors,
        setErrors,
        clearError,
    }), [values, getValue, getValues, setValue, setDefaultValue, errors, getErrors, setErrors, clearError]);

    return (
        <MmBlocksFormContext.Provider value={contextValue}>
            {children}
        </MmBlocksFormContext.Provider>
    );
}
