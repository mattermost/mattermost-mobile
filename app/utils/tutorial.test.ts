// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';

import {areTutorialsDisabled} from './tutorial';

describe('areTutorialsDisabled', () => {
    const mockedAreTutorialsDisabled = jest.mocked(RNUtils.areTutorialsDisabled);

    beforeEach(() => {
        mockedAreTutorialsDisabled.mockReturnValue(false);
    });

    it('returns false when not in e2e and launch arg is unset', () => {
        expect(areTutorialsDisabled('false')).toBe(false);
    });

    it('returns true when RUNNING_E2E is true', () => {
        expect(areTutorialsDisabled('true', () => false)).toBe(true);
    });

    it('returns true when RNUtils reports disableTutorials launch arg', () => {
        mockedAreTutorialsDisabled.mockReturnValue(true);
        expect(areTutorialsDisabled('false')).toBe(true);
    });

    it('returns false when RNUtils throws', () => {
        mockedAreTutorialsDisabled.mockImplementation(() => {
            throw new Error('native missing');
        });
        expect(areTutorialsDisabled('false')).toBe(false);
    });
});
