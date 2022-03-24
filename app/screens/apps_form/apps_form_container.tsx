// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {intlShape} from 'react-intl';

import {AppCallResponseTypes} from '@mm-redux/constants/apps';
import {ActionResult} from '@mm-redux/types/actions';
import {AppCallResponse, AppField, AppForm, AppFormValues, FormResponseData, AppLookupResponse, AppContext} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/theme';
import {DoAppCallResult, DoAppFetchForm, DoAppLookup, DoAppSubmit, PostEphemeralCallResponseForContext} from '@mm-types/actions/apps';
import {createCallRequest, makeCallErrorResponse} from '@utils/apps';

import AppsFormComponent from './apps_form_component';

export type Props = {
    form?: AppForm;
    context?: AppContext;
    actions: {
        doAppSubmit: DoAppSubmit<any>;
        doAppFetchForm: DoAppFetchForm<any>;
        doAppLookup: DoAppLookup<any>;
        postEphemeralCallResponseForContext: PostEphemeralCallResponseForContext;
        handleGotoLocation: (href: string, intl: any) => Promise<ActionResult>;
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

    handleSubmit = async (submission: {values: AppFormValues}): Promise<{data?: AppCallResponse<FormResponseData>; error?: AppCallResponse<FormResponseData>}> => {
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
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage(
                {
                    id: 'apps.error.form.no_form',
                    defaultMessage: '`form` is not defined',
                },
            )))};
        }

        if (!form.submit) {
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage(
                {
                    id: 'apps.error.form.no_submit',
                    defaultMessage: '`submit` is not defined',
                },
            )))};
        }

        if (!this.props.context) {
            return {error: makeCallErrorResponse('unreachable: empty context')};
        }

        const creq = createCallRequest(form.submit, this.props.context, {}, submission.values);
        const res = await this.props.actions.doAppSubmit(creq, intl) as DoAppCallResult<FormResponseData>;

        if (res.error) {
            return res;
        }

        const callResp = res.data!;
        switch (callResp.type) {
        case AppCallResponseTypes.OK:
            if (callResp.text) {
                this.props.actions.postEphemeralCallResponseForContext(callResp, callResp.text, creq.context);
            }
            break;
        case AppCallResponseTypes.FORM:
            this.setState({form: callResp.form});
            break;
        case AppCallResponseTypes.NAVIGATE:
            break;
        default:
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage(
                {
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: callResp.type,
                },
            )))};
        }
        return res;
    };

    refreshOnSelect = async (field: AppField, values: AppFormValues): Promise<DoAppCallResult<FormResponseData>> => {
        const intl = this.context.intl;
        const makeErrorMsg = (message: string) => intl.formatMessage(
            {
                id: 'apps.error.form.refresh',
                defaultMessage: 'There has been an error updating the modal. Contact the app developer. Details: {details}',
            },
            {details: message},
        );
        const {form} = this.state;
        if (!form) {
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage({
                id: 'apps.error.form.no_form',
                defaultMessage: '`form` is not defined.',
            })))};
        }

        if (!form.source) {
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage({
                id: 'apps.error.form.no_source',
                defaultMessage: '`source` is not defined.',
            })))};
        }

        if (!field.refresh) {
            // Should never happen
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage({
                id: 'apps.error.form.refresh_no_refresh',
                defaultMessage: 'Called refresh on no refresh field.',
            })))};
        }

        if (!this.props.context) {
            return {error: makeCallErrorResponse('unreachable: empty context')};
        }

        const creq = createCallRequest(form.source, this.props.context, {}, values);
        creq.selected_field = field.name;

        const res = await this.props.actions.doAppFetchForm(creq, intl);

        if (res.error) {
            return res;
        }
        const callResp = res.data!;
        switch (callResp.type) {
        case AppCallResponseTypes.FORM:
            this.setState({form: callResp.form});
            break;
        case AppCallResponseTypes.OK:
        case AppCallResponseTypes.NAVIGATE:
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage({
                id: 'apps.error.responses.unexpected_type',
                defaultMessage: 'App response type was not expected. Response type: {type}.',
            }, {
                type: callResp.type,
            },
            )))};
        default:
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResp.type,
            },
            )))};
        }
        return res;
    };

    performLookupCall = async (field: AppField, values: AppFormValues, userInput: string): Promise<DoAppCallResult<AppLookupResponse>> => {
        const intl = this.context.intl;
        const makeErrorMsg = (message: string) => intl.formatMessage(
            {
                id: 'apps.error.form.refresh',
                defaultMessage: 'There has been an error fetching the select fields. Contact the app developer. Details: {details}',
            },
            {details: message},
        );
        if (!field.lookup) {
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage({
                id: 'apps.error.form.no_lookup',
                defaultMessage: '`lookup` is not defined.',
            })))};
        }

        if (!this.props.context) {
            return {error: makeCallErrorResponse('unreachable: empty context')};
        }

        const creq = createCallRequest(field.lookup, this.props.context, {}, values);
        creq.selected_field = field.name;
        creq.query = userInput;

        return this.props.actions.doAppLookup(creq, intl);
    };

    render() {
        const {form} = this.state;
        if (!form?.submit || !this.props.context) {
            return null;
        }

        return (
            <AppsFormComponent
                form={form}
                actions={{
                    submit: this.handleSubmit,
                    performLookupCall: this.performLookupCall,
                    refreshOnSelect: this.refreshOnSelect,
                    handleGotoLocation: this.props.actions.handleGotoLocation,
                }}
                theme={this.props.theme}
                componentId={this.props.componentId}
            />
        );
    }
}
