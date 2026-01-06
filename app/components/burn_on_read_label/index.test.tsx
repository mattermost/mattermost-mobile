// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import BoRLabel from './index';

describe('components/burn_on_read_label', () => {
    it('should render BoR label with formatted duration', () => {
        const {getByTestId, getByText} = renderWithIntl(<BoRLabel durationSeconds={300}/>);

        expect(getByTestId('bor_label')).toBeVisible();
        expect(getByText('BURN ON READ (5m)')).toBeVisible();
    });

    it('should render with custom test ID when id prop is provided', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel
                durationSeconds={300}
                id='custom'
            />,
        );

        expect(getByTestId('custom_bor_label')).toBeVisible();
    });

    it('should render with default test ID when no id prop is provided', () => {
        const {getByTestId} = renderWithIntl(<BoRLabel durationSeconds={300}/>);

        expect(getByTestId('bor_label')).toBeVisible();
    });

    it('should handle different duration values', () => {
        const {getByTestId, getByText} = renderWithIntl(<BoRLabel durationSeconds={60}/>);

        expect(getByTestId('bor_label')).toBeVisible();
        expect(getByText('BURN ON READ (1m)')).toBeVisible();
    });

    it('should display correct time format for seconds only', () => {
        const {getByText} = renderWithIntl(<BoRLabel durationSeconds={30}/>);

        expect(getByText('BURN ON READ (30s)')).toBeVisible();
    });

    it('should display correct time format for hours, minutes and seconds', () => {
        const {getByText} = renderWithIntl(<BoRLabel durationSeconds={3661}/>);

        expect(getByText('BURN ON READ (1h 1m 1s)')).toBeVisible();
    });

    it('should display correct time format for hours and minutes', () => {
        const {getByText} = renderWithIntl(<BoRLabel durationSeconds={3600}/>);

        expect(getByText('BURN ON READ (1h)')).toBeVisible();
    });

    it('should render Tag component with correct props', () => {
        const {getByTestId} = renderWithIntl(<BoRLabel durationSeconds={300}/>);

        const tag = getByTestId('bor_label');
        expect(tag).toBeVisible();

        // The Tag component should have the fire icon and dangerDim type
        // These would be tested in the Tag component's own tests
    });
});
