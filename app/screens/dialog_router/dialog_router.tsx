// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import {useServerUrl} from '@context/server';
import AppsFormComponent from '@screens/apps_form/apps_form_component';
import InteractiveDialog from '@screens/interactive_dialog';
import {InteractiveDialogAdapter} from '@utils/interactive_dialog_adapter';

import type {AvailableScreens} from '@typings/screens/navigation';

export type DialogRouterProps = {
    config: InteractiveDialogConfig;
    componentId: AvailableScreens;
    isAppsFormEnabled: boolean;
};

/**
 * DialogRouter - Routes between legacy InteractiveDialog and modern AppsForm
 * Based on webapp DialogRouter component from PR #31821
 *
 * When InteractiveDialogAppsForm feature flag is enabled:
 * - Converts dialog config to AppForm format
 * - Renders AppsFormContainer with conversion handlers
 *
 * When feature flag is disabled:
 * - Renders legacy InteractiveDialog component
 */
export const DialogRouter = React.memo<DialogRouterProps>(({
    config,
    componentId,
    isAppsFormEnabled,
}) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();

    // Create submit handler that converts AppForm values back to legacy format
    const handleSubmit = useCallback((values: AppFormValues): Promise<DoAppCallResult<FormResponseData>> => {
        return InteractiveDialogAdapter.createSubmitHandler(config, serverUrl, intl)(values);
    }, [config, serverUrl, intl]);

    // Memoize form conversion to avoid recalculation on every render
    const appForm = useMemo(() => {
        if (!isAppsFormEnabled) {
            return null;
        }
        try {
            return InteractiveDialogAdapter.convertToAppForm(config);
        } catch {
            return null;
        }
    }, [config, isAppsFormEnabled]);

    // Helper function to find dialog element
    const findDialogElement = (fieldName: string) => {
        const elements = config.dialog.elements || [];
        return elements.find((e) => e.name === fieldName);
    };

    // Create performLookupCall for dynamic select fields
    const performLookupCall = useCallback(async (field: AppField, values: AppFormValues, userInput: AppFormValue): Promise<DoAppCallResult<AppLookupResponse>> => {
        try {
            // Find the field in the dialog configuration
            const element = findDialogElement(field.name || '');

            if (!element || element.data_source !== 'dynamic' || !element.data_source_url) {
                return {data: {type: 'ok', data: {items: []}}};
            }

            // Make the dynamic lookup request using InteractiveDialogAdapter
            const result = await InteractiveDialogAdapter.performDynamicLookup(element, String(userInput || ''), serverUrl);
            return {data: {type: 'ok', data: {items: result}}};
        } catch (error) {
            return {data: {type: 'ok', data: {items: []}}};
        }
    }, [config, serverUrl]);

    // Create refreshOnSelect - not used for basic dialogs but required by AppsFormComponent
    const refreshOnSelect = useCallback(async (): Promise<DoAppCallResult<FormResponseData>> => {
        return {data: {type: 'ok'}};
    }, []);

    if (isAppsFormEnabled && appForm && appForm.fields) {
        return (
            <AppsFormComponent
                form={appForm}
                componentId={componentId}
                submit={handleSubmit}
                performLookupCall={performLookupCall}
                refreshOnSelect={refreshOnSelect}
            />
        );
    }

    // Feature flag disabled or AppsForm failed - use legacy InteractiveDialog
    return (
        <InteractiveDialog
            config={config}
            componentId={componentId}
        />
    );
});

DialogRouter.displayName = 'DialogRouter';
