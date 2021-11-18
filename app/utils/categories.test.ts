// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GlobalState} from '@mm-redux/types/store';

import {shouldShowLegacySidebar} from './categories';

describe('Show Legacy Sidebar', () => {
    const state = {
        entities: {
            general: {
                config: {
                    Version: '5.31.0',
                    ExperimentalChannelSidebarOrganization: '',
                    EnableLegacySidebar: '',
                },
            },
            preferences: {
                myPreferences: {
                    sidebar_settings: {
                        channel_sidebar_organization: 'true',
                    },
                },
            },
        },
    };

    it('should show on servers < v5.32.0', () => {
        expect(shouldShowLegacySidebar(state as unknown as GlobalState)).toBe(true);

        state.entities.general.config.Version = '5.30.0';
        expect(shouldShowLegacySidebar(state as unknown as GlobalState)).toBe(true);

        state.entities.general.config.Version = '5.31.100';
        expect(shouldShowLegacySidebar(state as unknown as GlobalState)).toBe(true);
    });

    it('should not show on servers >= v5.32.0', () => {
        state.entities.general.config.Version = '5.32.0';
        expect(shouldShowLegacySidebar(state as unknown as GlobalState)).toBe(false);

        state.entities.general.config.Version = '5.35.5';
        expect(shouldShowLegacySidebar(state as unknown as GlobalState)).toBe(false);
    });

    it('should not show on older servers if ExperimentalChannelSidebarOrganization is true', () => {
        state.entities.general.config.ExperimentalChannelSidebarOrganization = 'true';
        expect(shouldShowLegacySidebar(state as unknown as GlobalState)).toBe(false);
    });

    it('should show on newer servers if EnableLegacySidebar is true', () => {
        state.entities.general.config.EnableLegacySidebar = 'true';
        state.entities.general.config.Version = '5.32.0';
        expect(shouldShowLegacySidebar(state as unknown as GlobalState)).toBe(true);
    });
});
