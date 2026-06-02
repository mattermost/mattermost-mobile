// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';

import {runWithBackgroundTask} from './background_task';

jest.mock('@mattermost/rnutils', () => ({
    __esModule: true,
    default: {
        beginBackgroundTask: jest.fn(),
        endBackgroundTask: jest.fn(),
    },
}));

const mockedRNUtils = jest.mocked(RNUtils);

describe('runWithBackgroundTask', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('brackets the task with a background-task assertion and returns its result', async () => {
        mockedRNUtils.beginBackgroundTask.mockReturnValue(7);
        const task = jest.fn().mockResolvedValue('done');

        const result = await runWithBackgroundTask('test', task);

        expect(result).toBe('done');
        expect(mockedRNUtils.beginBackgroundTask).toHaveBeenCalledTimes(1);
        expect(task).toHaveBeenCalledTimes(1);
        expect(mockedRNUtils.endBackgroundTask).toHaveBeenCalledWith(7);
    });

    it('ends the background task even when the work throws', async () => {
        mockedRNUtils.beginBackgroundTask.mockReturnValue(7);
        const error = new Error('boom');

        await expect(runWithBackgroundTask('test', () => Promise.reject(error))).rejects.toThrow(error);

        expect(mockedRNUtils.endBackgroundTask).toHaveBeenCalledWith(7);
    });

    it('still runs the work and does not end a task when begin fails', async () => {
        mockedRNUtils.beginBackgroundTask.mockImplementation(() => {
            throw new Error('no native module');
        });
        const task = jest.fn().mockResolvedValue('done');

        const result = await runWithBackgroundTask('test', task);

        expect(result).toBe('done');
        expect(task).toHaveBeenCalledTimes(1);
        expect(mockedRNUtils.endBackgroundTask).not.toHaveBeenCalled();
    });

    it('does not end a task when begin returns the invalid sentinel (e.g. Android no-op)', async () => {
        mockedRNUtils.beginBackgroundTask.mockReturnValue(-1);
        const task = jest.fn().mockResolvedValue('done');

        await runWithBackgroundTask('test', task);

        expect(task).toHaveBeenCalledTimes(1);
        expect(mockedRNUtils.endBackgroundTask).not.toHaveBeenCalled();
    });
});
