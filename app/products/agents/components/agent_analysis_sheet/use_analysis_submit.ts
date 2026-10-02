// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useRef, useState} from 'react';
import {useIntl, type MessageDescriptor} from 'react-intl';
import {Alert} from 'react-native';

import {dismissBottomSheet} from '@screens/navigation';
import {getErrorMessage} from '@utils/errors';

/**
 * Runs an analysis request from a sheet: one request at a time (the ref
 * guards taps that land before the submitting state re-renders), an alert on
 * failure, and the sheet dismissed on success.
 */
export function useAnalysisSubmit(errorTitle: MessageDescriptor) {
    const intl = useIntl();
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);

    const runSubmit = useCallback(async (request: () => Promise<{error?: unknown}>) => {
        if (submittingRef.current) {
            return;
        }
        submittingRef.current = true;
        setSubmitting(true);

        const {error} = await request();
        if (error) {
            submittingRef.current = false;
            setSubmitting(false);
            Alert.alert(intl.formatMessage(errorTitle), getErrorMessage(error, intl));
            return;
        }

        dismissBottomSheet();
    }, [intl, errorTitle]);

    return {submitting, runSubmit};
}
