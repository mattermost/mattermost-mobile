// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Selection} from '@components/autocomplete_selector';

class SettingsStoreSingleton {
    private updateAutomaticTimezoneCallback?: (mtz: string) => void;
    private integrationsSelectCallback?: (newSelection?: Selection) => void;
    private integrationsDynamicOptionsCallback?: (userInput?: string) => Promise<DialogOption[]>;

    public setUpdateAutomaticTimezoneCallback(callback: (mtz: string) => void) {
        this.updateAutomaticTimezoneCallback = callback;
    }

    public getUpdateAutomaticTimezoneCallback() {
        return this.updateAutomaticTimezoneCallback;
    }

    public removeUpdateAutomaticTimezoneCallback() {
        this.updateAutomaticTimezoneCallback = undefined;
    }

    public setIntegrationsSelectCallback(callback: (newSelection?: Selection | undefined) => void) {
        this.integrationsSelectCallback = callback;
    }

    public getIntegrationsSelectCallback() {
        return this.integrationsSelectCallback;
    }

    public removeIntegrationsSelectCallback() {
        this.integrationsSelectCallback = undefined;
    }

    public setIntegrationsDynamicOptionsCallback(callback?: (userInput?: string) => Promise<DialogOption[]>) {
        this.integrationsDynamicOptionsCallback = callback;
    }

    public getIntegrationsDynamicOptionsCallback() {
        return this.integrationsDynamicOptionsCallback;
    }

    public removeIntegrationsDynamicOptionsCallback() {
        this.integrationsDynamicOptionsCallback = undefined;
    }
}

const SettingsStore = new SettingsStoreSingleton();
export default SettingsStore;
