// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React, {useState, type ComponentProps, type ReactNode} from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {
    MmBlocksFieldError,
    MmBlocksForm,
    RelayedMmBlocksForm,
    formValuesToDialogSubmission,
    useMmBlocksForm,
    type MmBlocksFormContextValue,
    type MmBlocksFormErrors,
    type MmBlocksFormRelayApi,
    type MmBlocksFormValues,
    type MmFormValue,
} from '.';

describe('formValuesToDialogSubmission', () => {
    it('should join arrays, stringify primitives and drop empty values', () => {
        expect(formValuesToDialogSubmission({
            title: 'Bug',
            tags: ['one', 'two'],
            notify: false,
            reviewers: [],
            assignee: null,
        })).toEqual({
            title: 'Bug',
            tags: 'one,two',
            notify: 'false',
            reviewers: '',
        });
    });
});

describe('MmBlocksForm', () => {
    let form: MmBlocksFormContextValue;
    const onErrorsChange = jest.fn();

    function Probe() {
        form = useMmBlocksForm();
        return null;
    }

    /** Keeps `errors` in sync so setErrors/clearError updates are visible on the context. */
    function StatefulForm({
        children,
        initialErrors = {},
        onErrorsChange: onErrorsChangeProp,
    }: {
        children: ReactNode;
        initialErrors?: MmBlocksFormErrors;
        onErrorsChange?: ComponentProps<typeof MmBlocksForm>['onErrorsChange'];
    }) {
        const [errors, setErrors] = useState(initialErrors);
        return (
            <MmBlocksForm
                errors={errors}
                onErrorsChange={(next) => {
                    setErrors(next);
                    onErrorsChangeProp?.(next);
                }}
            >
                {children}
            </MmBlocksForm>
        );
    }

    function renderForm(
        props: Partial<ComponentProps<typeof MmBlocksForm>> & {initialErrors?: MmBlocksFormErrors} = {},
    ) {
        const {initialErrors, errors, onErrorsChange: onErrorsChangeProp, ...rest} = props;
        if (errors !== undefined) {
            return renderWithIntlAndTheme(
                <MmBlocksForm
                    errors={errors}
                    onErrorsChange={onErrorsChangeProp || onErrorsChange}
                    {...rest}
                >
                    <Probe/>
                    <MmBlocksFieldError name='title'/>
                </MmBlocksForm>,
            );
        }
        return renderWithIntlAndTheme(
            <StatefulForm
                initialErrors={initialErrors}
                onErrorsChange={onErrorsChangeProp || onErrorsChange}
            >
                <Probe/>
                <MmBlocksFieldError name='title'/>
            </StatefulForm>,
        );
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should throw when useMmBlocksForm is used outside a form', () => {
        function Consumer() {
            useMmBlocksForm();
            return null;
        }

        expect(() => renderWithIntlAndTheme(<Consumer/>)).toThrow('useMmBlocksForm must be used within MmBlocksForm');
    });

    it('should expose values through getValue, getValues, and setValue', () => {
        renderForm();

        act(() => form.setValue('title', 'Bug'));

        expect(form.values).toEqual({title: 'Bug'});
        expect(form.getValue('title')).toBe('Bug');
        expect(form.getValues()).toEqual({title: 'Bug'});
        expect(form.getValue('missing')).toBeUndefined();
    });

    it('should not create a new values map when setValue receives the current value', () => {
        renderForm();

        act(() => form.setValue('title', 'Bug'));
        const values = form.values;

        act(() => form.setValue('title', 'Bug'));

        expect(form.values).toBe(values);
    });

    it('should seed a default value only while the field is unset', () => {
        renderForm();

        act(() => form.setDefaultValue('title', 'seeded'));
        expect(form.values).toEqual({title: 'seeded'});

        act(() => form.setDefaultValue('title', 'reseeded'));
        expect(form.values).toEqual({title: 'seeded'});
    });

    it('should clear the error of a field when its value changes', () => {
        renderForm({initialErrors: {title: 'Required', body: 'Required'}});

        act(() => form.setValue('title', 'Bug'));

        expect(form.errors).toEqual({body: 'Required'});
    });

    it('should keep the error map untouched when clearing an error that is not set', () => {
        renderForm({initialErrors: {body: 'Required'}});
        const errors = form.errors;

        act(() => form.clearError('title'));

        expect(form.errors).toBe(errors);
    });

    it('should render the error of a field once it is set', () => {
        const {getByTestId, queryByTestId, rerender} = renderForm({errors: {}, onErrorsChange});

        expect(queryByTestId('title-error')).toBeNull();

        act(() => form.setErrors({title: 'Required'}));
        expect(onErrorsChange).toHaveBeenCalledWith({title: 'Required'});

        rerender(
            <MmBlocksForm
                errors={{title: 'Required'}}
                onErrorsChange={onErrorsChange}
            >
                <Probe/>
                <MmBlocksFieldError name='title'/>
            </MmBlocksForm>,
        );

        expect(getByTestId('title-error')).toHaveTextContent('Required');
    });

    it('should report errors through onErrorsChange instead of storing them', () => {
        renderForm({errors: {}, onErrorsChange});

        act(() => form.setErrors({title: 'Required'}));

        expect(onErrorsChange).toHaveBeenCalledWith({title: 'Required'});
        expect(form.errors).toEqual({});
    });

    it('should report the cleared error as an absolute map when the field value changes', () => {
        renderForm({errors: {title: 'Required', body: 'Required'}, onErrorsChange});

        act(() => form.setValue('title', 'Bug'));

        expect(onErrorsChange).toHaveBeenCalledTimes(1);
        expect(onErrorsChange).toHaveBeenCalledWith({body: 'Required'});
        expect(form.getErrors()).toEqual({body: 'Required'});
    });

    it('should not report when clearing an error that is not set', () => {
        renderForm({errors: {body: 'Required'}, onErrorsChange});

        act(() => form.clearError('title'));

        expect(onErrorsChange).not.toHaveBeenCalled();
    });
});

describe('RelayedMmBlocksForm', () => {
    it('should forward writes to the host API and update local context values', () => {
        const hostValues: MmBlocksFormValues = {title: 'Seed'};
        const hostErrors: MmBlocksFormErrors = {};
        const api: MmBlocksFormRelayApi = {
            getValues: () => hostValues,
            getErrors: () => hostErrors,
            setValue: jest.fn((name: string, value: MmFormValue) => {
                hostValues[name] = value;
            }),
            setDefaultValue: jest.fn(),
            setErrors: jest.fn((next: MmBlocksFormErrors) => {
                Object.keys(hostErrors).forEach((key) => delete hostErrors[key]);
                Object.assign(hostErrors, next);
            }),
            clearError: jest.fn(),
        };

        let relayed!: MmBlocksFormContextValue;
        function Probe() {
            relayed = useMmBlocksForm();
            return null;
        }

        renderWithIntlAndTheme(
            <RelayedMmBlocksForm api={api}>
                <Probe/>
            </RelayedMmBlocksForm>,
        );

        expect(relayed.values).toEqual({title: 'Seed'});

        act(() => relayed.setValue('title', 'Updated'));

        expect(api.setValue).toHaveBeenCalledWith('title', 'Updated');
        expect(relayed.values).toEqual({title: 'Updated'});
        expect(hostValues).toEqual({title: 'Updated'});
    });

    it('should resync local state from the host API when resync is called', () => {
        const hostValues: MmBlocksFormValues = {title: 'Seed'};
        const hostErrors: MmBlocksFormErrors = {};
        const api: MmBlocksFormRelayApi = {
            getValues: () => ({...hostValues}),
            getErrors: () => ({...hostErrors}),
            setValue: jest.fn(),
            setDefaultValue: jest.fn(),
            setErrors: jest.fn(),
            clearError: jest.fn(),
        };

        let relayed!: MmBlocksFormContextValue;
        function Probe() {
            relayed = useMmBlocksForm();
            return null;
        }

        renderWithIntlAndTheme(
            <RelayedMmBlocksForm api={api}>
                <Probe/>
            </RelayedMmBlocksForm>,
        );

        hostValues.title = 'From host';
        hostErrors.title = 'Invalid';

        act(() => api.resync?.());

        expect(relayed.values).toEqual({title: 'From host'});
        expect(relayed.errors).toEqual({title: 'Invalid'});
    });
});
