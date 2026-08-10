// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Label from './label';

describe('Label', () => {
    it('should render the label with a required asterisk', () => {
        const {getByText, getByTestId} = renderWithIntlAndTheme(
            <Label
                label='Name'
                optional={false}
                testID='field'
            />,
        );

        expect(getByTestId('field.label')).toHaveTextContent('Name');
        expect(getByText(' *')).toBeTruthy();
    });

    it('should render the optional marker when optional', () => {
        const {getByText, queryByText} = renderWithIntlAndTheme(
            <Label
                label='Name'
                optional={true}
                testID='field'
            />,
        );

        expect(getByText('(optional)')).toBeTruthy();
        expect(queryByText(' *')).toBeNull();
    });

    it('should render nothing when the label is empty', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Label
                label=''
                optional={false}
                testID='field'
            />,
        );

        expect(toJSON()).toBeNull();
    });

    it('should render nothing when the label is only whitespace', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Label
                label='   '
                optional={true}
                testID='field'
            />,
        );

        expect(toJSON()).toBeNull();
    });
});
