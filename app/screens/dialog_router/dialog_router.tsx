// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import {useServerUrl} from '@context/server';
import AppsFormComponent from '@screens/apps_form/apps_form_component';
import InteractiveDialog from '@screens/interactive_dialog';
import {InteractiveDialogAdapter} from '@utils/interactive_dialog_adapter';

export type DialogRouterProps = {
    config: InteractiveDialogConfig;
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

    // Create performLookupCall - not used for basic dialogs but required by AppsFormComponent
    const performLookupCall = useCallback(async (): Promise<DoAppCallResult<AppLookupResponse>> => {
        return {data: {type: 'ok', data: {items: []}}};
    }, []);

    // Create refreshOnSelect - not used for basic dialogs but required by AppsFormComponent
    const refreshOnSelect = useCallback(async (): Promise<DoAppCallResult<FormResponseData>> => {
        return {data: {type: 'ok'}};
    }, []);

    if (isAppsFormEnabled && appForm && appForm.fields) {
        return (
            <AppsFormComponent
                form={appForm}
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
        />
    );
});

DialogRouter.displayName = 'DialogRouter';
