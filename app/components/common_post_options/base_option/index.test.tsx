// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import OptionItem from '@components/option_item';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import BaseOption from './index';

jest.mock('@components/option_item');
jest.mocked(OptionItem).mockImplementation((props) => React.createElement('OptionItem', props));

describe('BaseOption', () => {
    it('should force single line labels', () => {
        renderWithIntlAndTheme(
            <BaseOption
                message={{id: 'test.base_option.label', defaultMessage: 'Option label'}}
                iconName='icon-name'
                onPress={jest.fn()}
                testID='base-option'
            />,
        );

        expect(jest.mocked(OptionItem)).toHaveBeenCalled();
        expect(jest.mocked(OptionItem).mock.calls[0][0]).toEqual(expect.objectContaining({
            label: 'Option label',
            labelNumberOfLines: 1,
            type: 'default',
            testID: 'base-option',
        }));
    });
});
