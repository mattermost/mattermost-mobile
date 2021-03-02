// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';

import {Theme} from '@mm-redux/types/preferences';
import {AppCall, AppCallResponse, AppField, AppForm, AppFormValue, AppFormValues, AppLookupCallValues, AppSelectOption, FormResponseData} from '@mm-redux/types/apps';
import {AppCallResponseTypes, AppCallTypes} from '@mm-redux/constants/apps';
import AppsFormComponent from './apps_form_component';

export type Props = {
    form?: AppForm;
    call?: AppCall;
    actions: {
        doAppCall: (call: AppCall) => Promise<{data: AppCallResponse}>;
    };
    theme: Theme;
    componentId: string;
};

export type State = {
    form?: AppForm;
}

const makeError = (errMessage: string): {data: AppCallResponse<FormResponseData>} => {
    return {
        data: {
            type: 'error',
            error: 'There has been an error submitting the modal. Contact the app developer. Details: ' + errMessage,
        },
    };
};

export default class AppsFormContainer extends PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {form: props.form};
    }

    handleSubmit = async (submission: {values: AppFormValues}): Promise<{data: AppCallResponse<FormResponseData>}> => {
        const {form} = this.state;
        if (!form) {
            return makeError('submitForm state.form is not defined');
        }

        const call = this.getCall();
        if (!call) {
            return makeError('submitForm props.call is not defined');
        }

        try {
            const res = await this.props.actions.doAppCall({
                ...call,
                type: AppCallTypes.SUBMIT,
                values: {
                    ...call.values,
                    ...submission.values,
                },
            });
            if (res.data.type === AppCallResponseTypes.FORM && res.data.form) {
                this.setState({form: res.data.form});
            }
            return res;
        } catch (e) {
            return makeError(e.message);
        }
    }

    refreshOnSelect = async (field: AppField, values: AppFormValues, value: AppFormValue): Promise<{data: AppCallResponse<any>}> => {
        const {form} = this.state;
        if (!form) {
            return makeError('refreshOnSelect state.form is not defined');
        }

        const call = this.getCall();
        if (!call) {
            return makeError('refreshOnSelect props.call is not defined');
        }

        if (!field.refresh) {
            return {
                data: {
                    type: '',
                    data: {},
                },
            };
        }

        try {
            const res = await this.props.actions.doAppCall({
                ...call,
                type: AppCallTypes.FORM,
                values: {
                    name: field.name,
                    values,
                    value,
                },
            });

            if (res?.data?.form) {
                this.setState({form: res.data.form});
            }

            return res;
        } catch (e) {
            return makeError(e.message);
        }
    };

    performLookupCall = async (field: AppField, formValues: AppFormValues, userInput: string): Promise<AppSelectOption[]> => {
        const call = this.getCall();
        if (!call) {
            return [];
        }

        const values: AppLookupCallValues = {
            name: field.name,
            user_input: userInput,
            values: formValues,
        };
        const res = await this.props.actions.doAppCall({
            ...call,
            type: AppCallTypes.LOOKUP,
            values,
        });

        if (res.data.type === AppCallResponseTypes.ERROR) {
            return [];
        }

        const data = res.data.data as {items: AppSelectOption[]};
        if (data.items && data.items.length) {
            return data.items;
        }

        return [];
    }

    getCall = (): AppCall | null => {
        const {form} = this.state;

        const {call} = this.props;
        if (!call) {
            return null;
        }

        return {
            ...call,
            ...form?.call,
            context: {
                ...call.context,
            },
            values: {
                ...call.values,
                ...form?.call?.values,
            },
        };
    }

    render() {
        const {form} = this.state;
        if (!form) {
            return null;
        }

        const call = this.getCall();
        if (!call) {
            return null;
        }

        return (
            <AppsFormComponent
                form={form}
                call={call}
                actions={{
                    submit: this.handleSubmit,
                    performLookupCall: this.performLookupCall,
                    refreshOnSelect: this.refreshOnSelect,
                }}
                theme={this.props.theme}
                componentId={this.props.componentId}
            />
        );
    }
}
