// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getHasEverStartedSyncSubject, getLoadingTeamChannelsSubject, setTeamLoading} from './team_load_store';

describe('TeamLoadStore', () => {
    // Use unique server URLs for each test to avoid cross-test pollution
    let testCounter = 0;
    const getUniqueServerUrl = () => `https://test-server-${++testCounter}.com`;

    it('should create a new subject for a server URL', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getLoadingTeamChannelsSubject(serverUrl);

        expect(subject).toBeDefined();
        expect(subject.value).toBe(0);
    });

    it('should return the same subject for the same server URL', () => {
        const serverUrl = getUniqueServerUrl();
        const subject1 = getLoadingTeamChannelsSubject(serverUrl);
        const subject2 = getLoadingTeamChannelsSubject(serverUrl);

        expect(subject1).toBe(subject2);
    });

    it('should create different subjects for different server URLs', () => {
        const serverUrl1 = getUniqueServerUrl();
        const serverUrl2 = getUniqueServerUrl();
        const subject1 = getLoadingTeamChannelsSubject(serverUrl1);
        const subject2 = getLoadingTeamChannelsSubject(serverUrl2);

        expect(subject1).not.toBe(subject2);
    });

    it('should increment loading count when setTeamLoading is true', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getLoadingTeamChannelsSubject(serverUrl);
        const initialValue = subject.value;

        setTeamLoading(serverUrl, true);

        expect(subject.value).toBe(initialValue + 1);
    });

    it('should decrement loading count when setTeamLoading is false', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getLoadingTeamChannelsSubject(serverUrl);

        setTeamLoading(serverUrl, true);
        setTeamLoading(serverUrl, true);
        const valueAfterIncrement = subject.value;

        setTeamLoading(serverUrl, false);

        expect(subject.value).toBe(valueAfterIncrement - 1);
    });

    it('should handle multiple concurrent loading operations', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getLoadingTeamChannelsSubject(serverUrl);
        const initialValue = subject.value;

        setTeamLoading(serverUrl, true);
        setTeamLoading(serverUrl, true);
        setTeamLoading(serverUrl, true);

        expect(subject.value).toBe(initialValue + 3);

        setTeamLoading(serverUrl, false);
        setTeamLoading(serverUrl, false);

        expect(subject.value).toBe(initialValue + 1);

        setTeamLoading(serverUrl, false);

        expect(subject.value).toBe(initialValue);
    });

    it('should manage loading states independently per server', () => {
        const serverUrl1 = getUniqueServerUrl();
        const serverUrl2 = getUniqueServerUrl();
        const subject1 = getLoadingTeamChannelsSubject(serverUrl1);
        const subject2 = getLoadingTeamChannelsSubject(serverUrl2);

        setTeamLoading(serverUrl1, true);
        setTeamLoading(serverUrl1, true);

        setTeamLoading(serverUrl2, true);

        expect(subject1.value).toBe(2);
        expect(subject2.value).toBe(1);

        setTeamLoading(serverUrl1, false);

        expect(subject1.value).toBe(1);
        expect(subject2.value).toBe(1);
    });

    it('should emit values through observable', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getLoadingTeamChannelsSubject(serverUrl);
        const mockCallback = jest.fn();
        const subscription = subject.subscribe(mockCallback);
        const initialValue = subject.value;

        // Should immediately get current value
        expect(mockCallback).toHaveBeenCalledWith(initialValue);

        setTeamLoading(serverUrl, true);

        // Should get new value
        expect(mockCallback).toHaveBeenCalledWith(initialValue + 1);

        setTeamLoading(serverUrl, false);

        // Should get decremented value
        expect(mockCallback).toHaveBeenCalledWith(initialValue);

        expect(mockCallback).toHaveBeenCalledTimes(3);

        subscription.unsubscribe();

        // After unsubscribe, callback should not be called
        setTeamLoading(serverUrl, true);
        expect(mockCallback).toHaveBeenCalledTimes(3);
    });

    it('should allow negative loading counts', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getLoadingTeamChannelsSubject(serverUrl);
        const initialValue = subject.value;

        setTeamLoading(serverUrl, false);

        expect(subject.value).toBe(initialValue - 1);
    });

    it('should initialize hasEverStartedSync to false', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getHasEverStartedSyncSubject(serverUrl);

        expect(subject.value).toBe(false);
    });

    it('should return the same hasEverStartedSync subject for the same server URL', () => {
        const serverUrl = getUniqueServerUrl();
        const subject1 = getHasEverStartedSyncSubject(serverUrl);
        const subject2 = getHasEverStartedSyncSubject(serverUrl);

        expect(subject1).toBe(subject2);
    });

    it('should create different hasEverStartedSync subjects for different server URLs', () => {
        const serverUrl1 = getUniqueServerUrl();
        const serverUrl2 = getUniqueServerUrl();
        const subject1 = getHasEverStartedSyncSubject(serverUrl1);
        const subject2 = getHasEverStartedSyncSubject(serverUrl2);

        expect(subject1).not.toBe(subject2);
    });

    it('should flip hasEverStartedSync to true on first setTeamLoading(true)', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getHasEverStartedSyncSubject(serverUrl);

        setTeamLoading(serverUrl, true);

        expect(subject.value).toBe(true);
    });

    it('should keep hasEverStartedSync true after setTeamLoading(false) (monotonic latch)', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getHasEverStartedSyncSubject(serverUrl);

        setTeamLoading(serverUrl, true);
        setTeamLoading(serverUrl, false);

        expect(subject.value).toBe(true);
    });

    it('should manage hasEverStartedSync independently per server', () => {
        const serverUrl1 = getUniqueServerUrl();
        const serverUrl2 = getUniqueServerUrl();
        const subject1 = getHasEverStartedSyncSubject(serverUrl1);
        const subject2 = getHasEverStartedSyncSubject(serverUrl2);

        setTeamLoading(serverUrl1, true);

        expect(subject1.value).toBe(true);
        expect(subject2.value).toBe(false);
    });

    it('should emit hasEverStartedSync only once across multiple setTeamLoading calls', () => {
        const serverUrl = getUniqueServerUrl();
        const subject = getHasEverStartedSyncSubject(serverUrl);
        const mockCallback = jest.fn();
        const subscription = subject.subscribe(mockCallback);

        // Initial replay of current value
        expect(mockCallback).toHaveBeenNthCalledWith(1, false);

        setTeamLoading(serverUrl, true);
        setTeamLoading(serverUrl, true);
        setTeamLoading(serverUrl, false);
        setTeamLoading(serverUrl, true);

        expect(mockCallback).toHaveBeenCalledTimes(2);
        expect(mockCallback).toHaveBeenNthCalledWith(2, true);

        subscription.unsubscribe();
    });
});
