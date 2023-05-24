// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard} from 'react-native';

import {doAppFetchForm, doAppLookup, doAppSubmit, postEphemeralCallResponseForContext} from '@actions/remote/apps';
import {handleGotoLocation} from '@actions/remote/command';
import {AppCallResponseTypes} from '@constants/apps';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {dismissModal} from '@screens/navigation';
import {createCallRequest, makeCallErrorResponse} from '@utils/apps';

import AppsFormComponent from './apps_form_component';

import type {AvailableScreens} from '@typings/screens/navigation';

export type Props = {
    form?: AppForm;
    context?: AppContext;
    componentId: AvailableScreens;
};

function AppsFormContainer({
    form,
    context,
    componentId,
}: Props) {
    const intl = useIntl();
    const [currentForm, setCurrentForm] = useState(form);
    const serverUrl = useServerUrl();

    const submit = useCallback(async (submission: AppFormValues): Promise<{data?: AppCallResponse<FormResponseData>; error?: AppCallResponse<FormResponseData>}> => {
        const makeErrorMsg = (msg: string) => {
            return intl.formatMessage(
                {
                    id: 'apps.error.form.submit.pretext',
                    defaultMessage: 'There has been an error submitting the modal. Contact the app developer. Details: {details}',
                },
                {details: msg},
            );
        };

        if (!currentForm) {
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage(
                {
                    id: 'apps.error.form.no_form',
                    defaultMessage: '`form` is not defined',
                },
            )))};
        }

        if (!currentForm.submit) {
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage(
                {
                    id: 'apps.error.form.no_submit',
                    defaultMessage: '`submit` is not defined',
                },
            )))};
        }

        if (!context) {
            return {error: makeCallErrorResponse('unreachable: empty context')};
        }

        const creq = createCallRequest(currentForm.submit, context, {}, submission);
        const res = await doAppSubmit<FormResponseData>(serverUrl, creq, intl);

        if ('error' in res) {
            return res;
        }

        const callResp = res.data;
        switch (callResp.type) {
            case AppCallResponseTypes.OK:
                if (callResp.text) {
                    postEphemeralCallResponseForContext(serverUrl, callResp, callResp.text, creq.context);
                }
                break;
            case AppCallResponseTypes.FORM:
                setCurrentForm(callResp.form);
                break;
            case AppCallResponseTypes.NAVIGATE:
                if (callResp.navigate_to_url) {
                    handleGotoLocation(serverUrl, intl, callResp.navigate_to_url);
                }
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
    }, [currentForm, setCurrentForm, context, serverUrl, intl]);

    const refreshOnSelect = useCallback(async (field: AppField, values: AppFormValues): Promise<DoAppCallResult<FormResponseData>> => {
        const makeErrorMsg = (message: string) => intl.formatMessage(
            {
                id: 'apps.error.form.refresh',
                defaultMessage: 'There has been an error updating the modal. Contact the app developer. Details: {details}',
            },
            {details: message},
        );
        if (!currentForm) {
            return {error: makeCallErrorResponse(makeErrorMsg(intl.formatMessage({
                id: 'apps.error.form.no_form',
                defaultMessage: '`form` is not defined.',
            })))};
        }

        if (!currentForm.source) {
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

        if (!context) {
            return {error: makeCallErrorResponse('unreachable: empty context')};
        }

        const creq = createCallRequest(currentForm.source, context, {}, values);
        creq.selected_field = field.name;

        const res = await doAppFetchForm<FormResponseData>(serverUrl, creq, intl);

        if (res.error) {
            return res;
        }
        const callResp = res.data!;
        switch (callResp.type) {
            case AppCallResponseTypes.FORM:
                setCurrentForm(callResp.form);
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
    }, [currentForm, setCurrentForm, context, serverUrl, intl]);

    const performLookupCall = useCallback(async (field: AppField, values: AppFormValues, userInput: string): Promise<DoAppCallResult<AppLookupResponse>> => {
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

        if (!context) {
            return {error: makeCallErrorResponse('unreachable: empty context')};
        }

        const creq = createCallRequest(field.lookup, context, {}, values);
        creq.selected_field = field.name;
        creq.query = userInput;

        return doAppLookup<AppLookupResponse>(serverUrl, creq, intl);
    }, [context, serverUrl, intl]);

    const close = useCallback(() => {
        Keyboard.dismiss();
        dismissModal({componentId});
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    if (!currentForm?.submit || !context) {
        return null;
    }

    return (
        <AppsFormComponent
            form={currentForm}
            componentId={componentId}
            performLookupCall={performLookupCall}
            refreshOnSelect={refreshOnSelect}
            submit={submit}
        />
    );
}

export default AppsFormContainer;
