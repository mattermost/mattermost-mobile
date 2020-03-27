// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {setLocalizeFunction, localizeMessage} from '@redux/utils/i18n_utils';

describe('i18n utils', () => {
    afterEach(() => {
        setLocalizeFunction(null);
    });

    it('should return default message', () => {
        assert.equal(localizeMessage('someting.string', 'defaultString'), 'defaultString');
    });

    it('should return previously set Localized function return value', () => {
        function mockFunc() {
            return 'test';
        }

        setLocalizeFunction(mockFunc);
        assert.equal(localizeMessage('someting.string', 'defaultString'), 'test');
    });
});
