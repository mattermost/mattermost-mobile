// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Import necessary dependencies
import {isAvailableAsync} from 'expo-store-review';

import * as actions from '@actions/app/global';
import LocalConfig from '@assets/config.json';
import {Launch} from '@constants';
import {getDontAskForReview, getLastAskedForReview} from '@queries/app/global';
import {areAllServersSupported} from '@queries/app/servers';
import {showReviewOverlay} from '@screens/navigation';

import {tryRunAppReview} from './reviews';

// Mocks
jest.mock('expo-store-review', () => ({
    isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('@queries/app/servers', () => ({
    areAllServersSupported: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('@queries/app/global', () => ({
    getDontAskForReview: jest.fn(() => Promise.resolve(false)),
    getFirstLaunch: jest.fn().mockResolvedValueOnce(0).mockResolvedValue(Date.now()),
    getLastAskedForReview: jest.fn().mockResolvedValueOnce(0).mockResolvedValue(Date.now() - (91 * 24 * 60 * 60 * 1000)),
}));
jest.mock('@actions/app/global', () => ({
    storeFirstLaunch: jest.fn(),
}));
jest.mock('@screens/navigation', () => ({
    showReviewOverlay: jest.fn(),
}));

describe('tryRunAppReview function', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear all mock calls after each test
    });

    it('should do nothing if LocalConfig.ShowReview is false', async () => {
        LocalConfig.ShowReview = false;
        await tryRunAppReview(Launch.Normal, true);
        expect(isAvailableAsync).not.toHaveBeenCalled();
    });

    it('should do nothing if coldStart is false', async () => {
        LocalConfig.ShowReview = true;
        await tryRunAppReview(Launch.Normal, false);
        expect(isAvailableAsync).not.toHaveBeenCalled();
    });

    it('should do nothing if launchType is not Launch.Normal', async () => {
        LocalConfig.ShowReview = true;
        await tryRunAppReview('SomeOtherType', true);
        expect(isAvailableAsync).not.toHaveBeenCalled();
    });

    it('should show review overlay if conditions are met', async () => {
        LocalConfig.ShowReview = true;
        const storeFirstLaunch = jest.spyOn(actions, 'storeFirstLaunch');
        await tryRunAppReview(Launch.Normal, true);
        expect(isAvailableAsync).toHaveBeenCalled();
        expect(areAllServersSupported).toHaveBeenCalled();
        expect(getDontAskForReview).toHaveBeenCalled();
        expect(getLastAskedForReview).toHaveBeenCalled();
        expect(storeFirstLaunch).toHaveBeenCalled();
    });

    it('should show review overlay if last review was done more than TIME_TO_NEXT_REVIEW ago', async () => {
        const storeFirstLaunch = jest.spyOn(actions, 'storeFirstLaunch');
        LocalConfig.ShowReview = true;
        await tryRunAppReview(Launch.Normal, true);
        expect(isAvailableAsync).toHaveBeenCalled();
        expect(areAllServersSupported).toHaveBeenCalled();
        expect(getDontAskForReview).toHaveBeenCalled();
        expect(getLastAskedForReview).toHaveBeenCalled();
        expect(storeFirstLaunch).not.toHaveBeenCalled();
        expect(showReviewOverlay).toHaveBeenCalledWith(true);
    });
});
