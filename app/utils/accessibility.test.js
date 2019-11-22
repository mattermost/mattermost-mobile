// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {accessibilityProps} from './accessibility';

describe('Accessibility', () => {
    it('should return accessibility props', () => {
        const id = 'app screen';
        const expected = {testID: `${id}`, accessibilityLabel: `${id}`};
        expect(accessibilityProps(id)).toEqual(expected);
    });
});
