// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';
import React, {type ReactNode} from 'react';
import {IntlProvider} from 'react-intl';
import {Alert} from 'react-native';

import {dismissBottomSheet} from '@screens/navigation';

import {useAnalysisSubmit} from './use_analysis_submit';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

const errorTitle = {id: 'test.error_title', defaultMessage: 'Unable to run analysis'};

const wrapper = ({children}: {children: ReactNode}) => (
    <IntlProvider locale='en'>{children}</IntlProvider>
);

describe('useAnalysisSubmit', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    });

    it('should send one request when submit fires twice before the sheet re-renders', async () => {
        const request = jest.fn().mockResolvedValue({});
        const {result} = renderHook(() => useAnalysisSubmit(errorTitle), {wrapper});

        await act(async () => {
            result.current.runSubmit(request);
            result.current.runSubmit(request);
        });

        expect(request).toHaveBeenCalledTimes(1);
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('should alert and allow another attempt when the request fails', async () => {
        const request = jest.fn().mockResolvedValueOnce({error: 'boom'}).mockResolvedValueOnce({});
        const {result} = renderHook(() => useAnalysisSubmit(errorTitle), {wrapper});

        await act(async () => {
            await result.current.runSubmit(request);
        });
        expect(Alert.alert).toHaveBeenCalledWith('Unable to run analysis', expect.any(String));
        expect(result.current.submitting).toBe(false);
        expect(dismissBottomSheet).not.toHaveBeenCalled();

        await act(async () => {
            await result.current.runSubmit(request);
        });
        expect(request).toHaveBeenCalledTimes(2);
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
    });
});
