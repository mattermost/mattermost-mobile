// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';

import {MmBlocksFormContext} from './context';

import type {MmBlocksFormContextValue, MmBlocksFormErrors, MmBlocksFormRelayApi, MmBlocksFormValues, MmFormValue} from './types';

type RelayedMmBlocksFormProps = {
    api: MmBlocksFormRelayApi;
    children: ReactNode;
};

/**
 * Re-provides MmBlocksFormContext on another screen by forwarding writes to a host form API
 * and keeping local state so the modal tree re-renders on edits.
 */
export function RelayedMmBlocksForm({api, children}: RelayedMmBlocksFormProps) {
    const [values, setValues] = useState<MmBlocksFormValues>(() => api.getValues());
    const [errors, setErrorsLocal] = useState<MmBlocksFormErrors>(() => api.getErrors());

    const resync = useCallback(() => {
        setValues(api.getValues());
        setErrorsLocal(api.getErrors());
    }, [api]);

    useEffect(() => {
        api.resync = resync;
        return () => {
            if (api.resync === resync) {
                delete api.resync;
            }
        };
    }, [api, resync]);

    const setValue = useCallback((name: string, value: MmFormValue) => {
        api.setValue(name, value);
        setValues((prev) => (prev[name] === value ? prev : {...prev, [name]: value}));
        setErrorsLocal((prev) => {
            if (!Object.prototype.hasOwnProperty.call(prev, name)) {
                return prev;
            }
            const next = {...prev};
            delete next[name];
            return next;
        });
    }, [api]);

    const setDefaultValue = useCallback((name: string, value: MmFormValue) => {
        api.setDefaultValue(name, value);
        setValues((prev) => {
            if (Object.prototype.hasOwnProperty.call(prev, name)) {
                return prev;
            }
            return {...prev, [name]: value};
        });
    }, [api]);

    const setErrors = useCallback((next: MmBlocksFormErrors) => {
        api.setErrors(next);
        setErrorsLocal(next);
    }, [api]);

    const clearError = useCallback((name: string) => {
        api.clearError(name);
        setErrorsLocal((prev) => {
            if (!Object.prototype.hasOwnProperty.call(prev, name)) {
                return prev;
            }
            const next = {...prev};
            delete next[name];
            return next;
        });
    }, [api]);

    const getValue = useCallback((name: string) => api.getValues()[name], [api]);
    const getValues = useCallback(() => api.getValues(), [api]);
    const getErrors = useCallback(() => api.getErrors(), [api]);

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
