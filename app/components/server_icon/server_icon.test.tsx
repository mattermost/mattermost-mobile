// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';

import Icon from './index';

describe('Server Icon', () => {
    test('Server Icon Component should match snapshot', async () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Icon
                hasUnreads={false}
                mentionCount={0}
            />,
        );

        await waitFor(() => {
            expect(toJSON()).toMatchSnapshot();
        });
    });

    test('Server Icon Component should match snapshot with unreads', async () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Icon
                hasUnreads={true}
                mentionCount={0}
                testID='server_icon'
            />,
        );

        await waitFor(() => {
            expect(toJSON()).toMatchSnapshot();
        });
    });

    test('Server Icon Component should match snapshot with mentions', async () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Icon
                hasUnreads={false}
                mentionCount={1}
                testID='server_icon'
            />,
        );

        await waitFor(() => {
            expect(toJSON()).toMatchSnapshot();
        });
    });
});
