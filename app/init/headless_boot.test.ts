// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

jest.mock('expo/src/winter/installGlobal', () => ({
    installGlobal: jest.fn(),
}), {virtual: true});

jest.mock('@init/app', () => ({
    initialize: jest.fn(),
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

jest.mock('react-native', () => ({
    AppRegistry: {
        registerHeadlessTask: jest.fn(),
    },
    DeviceEventEmitter: {
        addListener: jest.fn(),
    },
}));

type HeadlessHandler = () => Promise<void>;

function loadHeadlessHandler(): HeadlessHandler {
    require('./headless_boot');
    const {AppRegistry} = require('react-native');
    const registrations = AppRegistry.registerHeadlessTask.mock.calls;
    const registration = registrations[registrations.length - 1];
    expect(registration?.[0]).toBe('MMCallsBootTask');
    return registration?.[1]() as HeadlessHandler;
}

beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
});

describe('Android native-call headless boot', () => {
    it('finishes after an initialization failure instead of waiting forever', async () => {
        const {initialize} = require('@init/app');
        initialize.mockRejectedValueOnce(new Error('database unavailable'));
        const handler = loadHeadlessHandler();

        await handler();

        const {logError} = require('@utils/log');
        const {DeviceEventEmitter} = require('react-native');
        expect(logError).toHaveBeenCalledWith('MMCallsBootTask: initialize failed', expect.any(Error));
        expect(DeviceEventEmitter.addListener).not.toHaveBeenCalled();
    });

    it('waits for native call teardown after successful initialization', async () => {
        const {initialize} = require('@init/app');
        initialize.mockResolvedValueOnce(undefined);
        const {DeviceEventEmitter} = require('react-native');
        let endedListener: (() => void) | undefined;
        const remove = jest.fn();
        DeviceEventEmitter.addListener.mockImplementationOnce((_event: string, listener: () => void) => {
            endedListener = listener as () => void;
            return {remove};
        });
        const handler = loadHeadlessHandler();

        let settled = false;
        const task = handler().then(() => {
            settled = true;
        });
        await Promise.resolve();
        expect(settled).toBe(false);
        expect(endedListener).toBeDefined();

        endedListener!();
        await task;

        expect(settled).toBe(true);
        expect(remove).toHaveBeenCalledTimes(1);
    });
});
