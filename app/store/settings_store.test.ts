// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import SettingsStore from './settings_store';

describe('SettingsStore', () => {
    afterEach(() => {
        SettingsStore.removeUpdateAutomaticTimezoneCallback();
        SettingsStore.removeIntegrationsSelectCallback();
        SettingsStore.removeIntegrationsDynamicOptionsCallback();
    });

    describe('updateAutomaticTimezoneCallback', () => {
        it('should set and get update automatic timezone callback', () => {
            expect(SettingsStore.getUpdateAutomaticTimezoneCallback()).toBeUndefined();

            const mockCallback = jest.fn();
            SettingsStore.setUpdateAutomaticTimezoneCallback(mockCallback);

            expect(SettingsStore.getUpdateAutomaticTimezoneCallback()).toBe(mockCallback);
        });

        it('should remove update automatic timezone callback', () => {
            const mockCallback = jest.fn();
            SettingsStore.setUpdateAutomaticTimezoneCallback(mockCallback);
            expect(SettingsStore.getUpdateAutomaticTimezoneCallback()).toBe(mockCallback);

            SettingsStore.removeUpdateAutomaticTimezoneCallback();
            expect(SettingsStore.getUpdateAutomaticTimezoneCallback()).toBeUndefined();
        });

        it('should replace existing callback', () => {
            const firstCallback = jest.fn();
            const secondCallback = jest.fn();

            SettingsStore.setUpdateAutomaticTimezoneCallback(firstCallback);
            expect(SettingsStore.getUpdateAutomaticTimezoneCallback()).toBe(firstCallback);

            SettingsStore.setUpdateAutomaticTimezoneCallback(secondCallback);
            expect(SettingsStore.getUpdateAutomaticTimezoneCallback()).toBe(secondCallback);
        });
    });

    describe('integrationsSelectCallback', () => {
        it('should set and get integrations select callback', () => {
            expect(SettingsStore.getIntegrationsSelectCallback()).toBeUndefined();

            const mockCallback = jest.fn();
            SettingsStore.setIntegrationsSelectCallback(mockCallback);

            expect(SettingsStore.getIntegrationsSelectCallback()).toBe(mockCallback);
        });

        it('should remove integrations select callback', () => {
            const mockCallback = jest.fn();
            SettingsStore.setIntegrationsSelectCallback(mockCallback);
            expect(SettingsStore.getIntegrationsSelectCallback()).toBe(mockCallback);

            SettingsStore.removeIntegrationsSelectCallback();
            expect(SettingsStore.getIntegrationsSelectCallback()).toBeUndefined();
        });

        it('should replace existing callback', () => {
            const firstCallback = jest.fn();
            const secondCallback = jest.fn();

            SettingsStore.setIntegrationsSelectCallback(firstCallback);
            expect(SettingsStore.getIntegrationsSelectCallback()).toBe(firstCallback);

            SettingsStore.setIntegrationsSelectCallback(secondCallback);
            expect(SettingsStore.getIntegrationsSelectCallback()).toBe(secondCallback);
        });
    });

    describe('integrationsDynamicOptionsCallback', () => {
        it('should set and get integrations dynamic options callback', () => {
            expect(SettingsStore.getIntegrationsDynamicOptionsCallback()).toBeUndefined();

            const mockCallback = jest.fn().mockResolvedValue([]);
            SettingsStore.setIntegrationsDynamicOptionsCallback(mockCallback);

            expect(SettingsStore.getIntegrationsDynamicOptionsCallback()).toBe(mockCallback);
        });

        it('should remove integrations dynamic options callback', () => {
            const mockCallback = jest.fn().mockResolvedValue([]);
            SettingsStore.setIntegrationsDynamicOptionsCallback(mockCallback);
            expect(SettingsStore.getIntegrationsDynamicOptionsCallback()).toBe(mockCallback);

            SettingsStore.removeIntegrationsDynamicOptionsCallback();
            expect(SettingsStore.getIntegrationsDynamicOptionsCallback()).toBeUndefined();
        });

        it('should replace existing callback', () => {
            const firstCallback = jest.fn().mockResolvedValue([]);
            const secondCallback = jest.fn().mockResolvedValue([]);

            SettingsStore.setIntegrationsDynamicOptionsCallback(firstCallback);
            expect(SettingsStore.getIntegrationsDynamicOptionsCallback()).toBe(firstCallback);

            SettingsStore.setIntegrationsDynamicOptionsCallback(secondCallback);
            expect(SettingsStore.getIntegrationsDynamicOptionsCallback()).toBe(secondCallback);
        });

        it('should handle undefined callback', () => {
            const mockCallback = jest.fn().mockResolvedValue([]);
            SettingsStore.setIntegrationsDynamicOptionsCallback(mockCallback);

            SettingsStore.setIntegrationsDynamicOptionsCallback(undefined);
            expect(SettingsStore.getIntegrationsDynamicOptionsCallback()).toBeUndefined();
        });
    });

    describe('multiple callbacks', () => {
        it('should handle all three callbacks independently', () => {
            const timezoneCallback = jest.fn();
            const selectCallback = jest.fn();
            const dynamicCallback = jest.fn().mockResolvedValue([]);

            SettingsStore.setUpdateAutomaticTimezoneCallback(timezoneCallback);
            SettingsStore.setIntegrationsSelectCallback(selectCallback);
            SettingsStore.setIntegrationsDynamicOptionsCallback(dynamicCallback);

            expect(SettingsStore.getUpdateAutomaticTimezoneCallback()).toBe(timezoneCallback);
            expect(SettingsStore.getIntegrationsSelectCallback()).toBe(selectCallback);
            expect(SettingsStore.getIntegrationsDynamicOptionsCallback()).toBe(dynamicCallback);

            SettingsStore.removeIntegrationsSelectCallback();
            expect(SettingsStore.getUpdateAutomaticTimezoneCallback()).toBe(timezoneCallback);
            expect(SettingsStore.getIntegrationsSelectCallback()).toBeUndefined();
            expect(SettingsStore.getIntegrationsDynamicOptionsCallback()).toBe(dynamicCallback);
        });
    });
});
