// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import RequirementsAccordion from './requirements_accordion';

const requirements: TaskRequirement[] = [
    {id: 'r1', label: 'Ticket URL', value: ''},
    {id: 'r2', label: 'Root cause', value: 'filled'},
];

describe('RequirementsAccordion', () => {
    it('should render nothing when there are no requirements', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <RequirementsAccordion requirements={[]}/>,
        );
        expect(toJSON()).toBeNull();
    });

    it('should show Complete when incomplete and no values filled', () => {
        const onComplete = jest.fn();
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <RequirementsAccordion
                requirements={[{id: 'r1', label: 'Ticket URL', value: ''}]}
                isTaskComplete={false}
                onComplete={onComplete}
                onEditValues={jest.fn()}
            />,
        );

        expect(getByTestId('complete-requirement-values')).toBeTruthy();
        expect(queryByTestId('edit-requirement-values')).toBeNull();

        fireEvent.press(getByTestId('complete-requirement-values'));
        expect(onComplete).toHaveBeenCalled();
    });

    it('should hide Complete and show Edit when any field is filled', () => {
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <RequirementsAccordion
                requirements={requirements}
                isTaskComplete={false}
                onComplete={jest.fn()}
                onEditValues={jest.fn()}
            />,
        );

        expect(queryByTestId('complete-requirement-values')).toBeNull();
        expect(getByTestId('edit-requirement-values')).toBeTruthy();
    });
});
