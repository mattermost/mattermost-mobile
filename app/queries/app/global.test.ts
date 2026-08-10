// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import Tutorial from '@constants/tutorial';
import {areTutorialsDisabled} from '@utils/tutorial';

import {observeTutorialWatched} from './global';

jest.mock('@utils/tutorial', () => ({
    areTutorialsDisabled: jest.fn(() => false),
}));

jest.mock('@database/manager', () => ({
    getAppDatabaseAndOperator: jest.fn(() => {
        throw new Error('no database');
    }),
}));

describe('observeTutorialWatched', () => {
    const mockedAreTutorialsDisabled = jest.mocked(areTutorialsDisabled);

    beforeEach(() => {
        mockedAreTutorialsDisabled.mockReturnValue(false);
    });

    it('emits true immediately when tutorials are disabled for e2e', async () => {
        mockedAreTutorialsDisabled.mockReturnValue(true);
        await expect(firstValueFrom(observeTutorialWatched(Tutorial.MULTI_SERVER))).resolves.toBe(true);
    });

    it('emits false when tutorials are enabled and no global row exists', async () => {
        await expect(firstValueFrom(observeTutorialWatched(Tutorial.MULTI_SERVER))).resolves.toBe(false);
    });
});
