// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import FailedNetworkAction from './failed_network_action';
import {renderWithReduxIntl} from 'test/testing_library';
import Preferences from '@mm-redux/constants/preferences';
import {waitFor} from '@testing-library/react-native';

describe('FailedNetworkAction', () => {
    const baseProps = {
        onRetry: jest.fn(),
        theme: Preferences.THEMES.default,
        isLandscape: false,
        errorMessage: 'Error Message',
        errorTitle: 'Error Title',
    };

    test('Cloud in portrait', async () => {
        const {getByTestId} = renderWithReduxIntl(
            <FailedNetworkAction {...baseProps}/>,
        );

        await waitFor(() => expect(getByTestId('failed_network_action.cloud_icon')).toBeTruthy());
    });

    test('Cloud NOT in landscape', async () => {
        const props = {...baseProps, isLandscape: true};
        const {queryByTestId} = renderWithReduxIntl(
            <FailedNetworkAction {...props}/>,
        );

        await waitFor(() => expect(queryByTestId('failed_network_action.cloud_icon')).toBeNull());
    });
});
