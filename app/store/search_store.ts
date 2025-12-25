// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type TeamModel from '@typings/database/models/servers/team';
import type {FileFilter} from '@utils/file';

/**
 * SearchStore - Singleton store for search-related temporary state
 *
 * This store handles state that needs to be passed between the search screen
 * and its bottom sheet modals (team picker and file filter) in expo-router.
 * Since expo-router cannot pass functions as route params, we store callbacks
 * and data temporarily in this store.
 *
 * Pattern:
 * 1. Parent screen calls setTeamPickerData() or setFileFilterData() with data + callback
 * 2. Parent navigates to the bottom sheet route
 * 3. Bottom sheet route reads data from store
 * 4. User makes selection → bottom sheet calls the callback from store
 * 5. Bottom sheet clears the store data
 */
class SearchStoreSingleton {
    // Team picker state
    private teamPickerCallback?: (teamId: string) => void;
    private teamPickerData?: {
        teamId: string;
        teams: TeamModel[];
        crossTeamSearchEnabled: boolean;
    };

    // File filter state
    private fileFilterCallback?: (filter: FileFilter) => void;
    private fileFilterData?: {
        initialFilter: FileFilter;
    };

    // Team Picker Methods
    setTeamPickerData(data: {
        teamId: string;
        teams: TeamModel[];
        crossTeamSearchEnabled: boolean;
        callback: (teamId: string) => void;
    }) {
        this.teamPickerData = {
            teamId: data.teamId,
            teams: data.teams,
            crossTeamSearchEnabled: data.crossTeamSearchEnabled,
        };
        this.teamPickerCallback = data.callback;
    }

    getTeamPickerData() {
        return this.teamPickerData;
    }

    getTeamPickerCallback() {
        return this.teamPickerCallback;
    }

    clearTeamPickerData() {
        this.teamPickerData = undefined;
        this.teamPickerCallback = undefined;
    }

    // File Filter Methods
    setFileFilterData(data: {
        initialFilter: FileFilter;
        callback: (filter: FileFilter) => void;
    }) {
        this.fileFilterData = {
            initialFilter: data.initialFilter,
        };
        this.fileFilterCallback = data.callback;
    }

    getFileFilterData() {
        return this.fileFilterData;
    }

    getFileFilterCallback() {
        return this.fileFilterCallback;
    }

    clearFileFilterData() {
        this.fileFilterData = undefined;
        this.fileFilterCallback = undefined;
    }

    // Clear all search state
    clear() {
        this.clearTeamPickerData();
        this.clearFileFilterData();
    }
}

const SearchStore = new SearchStoreSingleton();
export default SearchStore;
