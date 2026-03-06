// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-hooks';

import type {AgentsConfigState} from './agents_config';

describe('AgentsConfigStore', () => {
    let getAgentsConfig: typeof import('./agents_config').getAgentsConfig;
    let setAgentsConfig: typeof import('./agents_config').setAgentsConfig;
    let observeAgentsConfig: typeof import('./agents_config').observeAgentsConfig;

    beforeEach(() => {
        jest.resetModules();
        const store = require('./agents_config');
        getAgentsConfig = store.getAgentsConfig;
        setAgentsConfig = store.setAgentsConfig;
        observeAgentsConfig = store.observeAgentsConfig;
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('getAgentsConfig / setAgentsConfig', () => {
        it('should return default config for a new server URL', () => {
            const config = getAgentsConfig('server1');
            expect(config).toEqual({pluginEnabled: false});
        });

        it('should update config when setAgentsConfig is called', () => {
            setAgentsConfig('server1', {pluginEnabled: true});

            const config = getAgentsConfig('server1');
            expect(config).toEqual({pluginEnabled: true});
        });

        it('should merge partial config updates', () => {
            setAgentsConfig('server1', {pluginEnabled: true});
            const configAfterFirst = getAgentsConfig('server1');
            expect(configAfterFirst.pluginEnabled).toBe(true);

            // Setting again with same partial should merge over existing values
            setAgentsConfig('server1', {pluginEnabled: false});
            const configAfterSecond = getAgentsConfig('server1');
            expect(configAfterSecond.pluginEnabled).toBe(false);
        });

        it('should maintain separate configs per server URL', () => {
            setAgentsConfig('server1', {pluginEnabled: true});
            setAgentsConfig('server2', {pluginEnabled: false});

            expect(getAgentsConfig('server1')).toEqual({pluginEnabled: true});
            expect(getAgentsConfig('server2')).toEqual({pluginEnabled: false});
        });
    });

    describe('observeAgentsConfig', () => {
        it('should emit default config on initial subscribe', () => {
            const receivedConfigs: AgentsConfigState[] = [];

            const subscription = observeAgentsConfig('server1').subscribe((config) => {
                receivedConfigs.push(config);
            });

            expect(receivedConfigs).toHaveLength(1);
            expect(receivedConfigs[0]).toEqual({pluginEnabled: false});

            subscription.unsubscribe();
        });

        it('should emit updated config after setAgentsConfig', () => {
            const receivedConfigs: AgentsConfigState[] = [];

            const subscription = observeAgentsConfig('server1').subscribe((config) => {
                receivedConfigs.push(config);
            });

            setAgentsConfig('server1', {pluginEnabled: true});

            expect(receivedConfigs).toHaveLength(2);
            expect(receivedConfigs[1]).toEqual({pluginEnabled: true});

            subscription.unsubscribe();
        });
    });
});

// Hook tests use static imports to avoid React instance mismatch from jest.resetModules().
// Each test uses a unique server URL for isolation (each creates a fresh BehaviorSubject).
describe('useAgentsConfig', () => {
    const {useAgentsConfig, setAgentsConfig} = require('./agents_config') as typeof import('./agents_config');

    it('should return default config initially', () => {
        const {result} = renderHook(() => useAgentsConfig('hook-test-default'));
        expect(result.current).toEqual({pluginEnabled: false});
    });

    it('should update when config changes', () => {
        const {result} = renderHook(() => useAgentsConfig('hook-test-update'));
        expect(result.current).toEqual({pluginEnabled: false});

        act(() => {
            setAgentsConfig('hook-test-update', {pluginEnabled: true});
        });
        expect(result.current).toEqual({pluginEnabled: true});
    });
});
