// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {filterEmptyOptions} from './apps';

describe('filterEmptyOptions', () => {
    it('should filter out empty options', () => {
        const options: AppSelectOption[] = [
            {label: 'Option 1', value: 'value1'},
            {label: 'Option 2', value: ' '},
            {label: 'Option 3', value: ''},
            {label: 'Option 4', value: 'value2'},
        ];

        const filteredOptions = options.filter(filterEmptyOptions);

        // Check that empty options have been filtered out
        expect(filteredOptions.length).toBe(2);
        expect(filteredOptions.map((option) => option.label)).toEqual(['Option 1', 'Option 4']);
    });
});
