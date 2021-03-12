// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {intlShape} from 'react-intl';

import {Theme} from '@mm-redux/types/preferences';
import {AppCallResponse, AppCallRequest, AppField, AppForm, AppFormValues, FormResponseData, AppCallType} from '@mm-redux/types/apps';
import {AppCallResponseTypes, AppCallTypes} from '@mm-redux/constants/apps';
import AppsFormComponent from './apps_form_component';
import {sendEphemeralPost} from '@actions/views/post';
import {makeCallErrorResponse} from '@utils/apps';

export type Props = {
    form?: AppForm;
    call?: AppCallRequest;
    actions: {
        doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data: AppCallResponse<FormResponseData>, error?: any}>;
    };
    theme: Theme;
    componentId: string;
};

export type State = {
    form?: AppForm;
}

export default class AppsFormContainer extends PureComponent<Props, State> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props: Props) {
        super(props);
        this.state = {form: props.form};
    }

    handleSubmit = async (submission: {values: AppFormValues}): Promise<{data: AppCallResponse<FormResponseData>}> => {
        const intl = this.context.intl;
        const makeErrorMsg = (msg: string) => {
            return intl.formatMessage(
                {
                    id: 'apps.error.form.submit.pretext',
                    defaultMessage: 'There has been an error submitting the modal. Contact the app developer. Details: {details}',
                },
                {details: msg},
            );
        };

        const {form} = this.state;
        if (!form) {
            return makeErrorMsg(intl.formatMessage({id: 'apps.error.form.no_form', defaultMessage: '`form` is not defined'}));
        }

        const call = this.getCall();
        if (!call) {
            return makeErrorMsg(intl.formatMessage({id: 'apps.error.form.no_call', defaultMessage: '`call` is not defined'}));
        }

        const res = await this.props.actions.doAppCall({
            ...call,
            values: submission.values,
        }, AppCallTypes.SUBMIT, intl);

        const callResp = res.data;
        switch (callResp.type) {
        case AppCallResponseTypes.OK:
            if (callResp.markdown) {
                sendEphemeralPost(callResp.markdown);
            }
            break;
        case AppCallResponseTypes.FORM:
            this.setState({form: callResp.form});
            break;
        case AppCallResponseTypes.NAVIGATE:
        case AppCallResponseTypes.ERROR:
            break;
        default:
            return {data: makeCallErrorResponse(makeErrorMsg(intl.formatMessage(
                {
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: callResp.type,
                },
            )))};
        }
        return res;
    }

    refreshOnSelect = async (field: AppField, values: AppFormValues): Promise<{data: AppCallResponse<any>}> => {
        const intl = this.context.intl;
        const makeErrMsg = (message: string) => intl.formatMessage(
            {
                id: 'apps.error.form.refresh',
                defaultMessage: 'There has been an error updating the modal. Contact the app developer. Details: {details}',
            },
            {details: message},
        );
        const {form} = this.state;
        if (!form) {
            return {data: makeCallErrorResponse(makeErrMsg(intl.formatMessage({
                id: 'apps.error.form.no_form',
                defaultMessage: '`form` is not defined.',
            })))};
        }

        const call = this.getCall();
        if (!call) {
            return {data: makeCallErrorResponse(makeErrMsg(intl.formatMessage({
                id: 'apps.error.form.no_call',
                defaultMessage: '`call` is not defined.',
            })))};
        }

        if (!field.refresh) {
            // Should never happen
            return {data: makeCallErrorResponse(makeErrMsg(intl.formatMessage({
                id: 'apps.error.form.refresh_no_refresh',
                defaultMessage: 'Called refresh on no refresh field.',
            })))};
        }

        const res = await this.props.actions.doAppCall({
            ...call,
            selected_field: field.name,
            values,

        }, AppCallTypes.FORM, intl);

        const callResp = res.data;
        switch (callResp.type) {
        case AppCallResponseTypes.FORM:
            this.setState({form: callResp.form});
            break;
        case AppCallResponseTypes.OK:
        case AppCallResponseTypes.NAVIGATE:
            return {data: makeCallErrorResponse(makeErrMsg(intl.formatMessage({
                id: 'apps.error.responses.unexpected_type',
                defaultMessage: 'App response type was not expected. Response type: {type}.',
            }, {
                type: callResp.type,
            },
            )))};
        case AppCallResponseTypes.ERROR:
            break;
        default:
            return {data: makeCallErrorResponse(makeErrMsg(intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResp.type,
            },
            )))};
        }
        return res;
    };

    performLookupCall = async (field: AppField, values: AppFormValues, userInput: string): Promise<{data: AppCallResponse<any>}> => {
        const intl = this.context.intl;
        const makeErrMsg = (message: string) => intl.formatMessage(
            {
                id: 'apps.error.form.refresh',
                defaultMessage: 'There has been an error fetching the select fields. Contact the app developer. Details: {details}',
            },
            {details: message},
        );
        const call = this.getCall();
        if (!call) {
            return makeErrMsg(intl.formatMessage({id: 'apps.error.form.no_lookup_call', defaultMessage: 'performLookupCall props.call is not defined'}));
        }

        return this.props.actions.doAppCall({
            ...call,
            values,
            selected_field: field.name,
            query: userInput,
        }, AppCallTypes.LOOKUP, intl);
    }

    getCall = (): AppCallRequest | null => {
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
