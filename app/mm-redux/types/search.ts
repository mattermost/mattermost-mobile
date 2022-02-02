// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dictionary} from '@mm-redux/types/utilities';

export type Search = {
    terms: string;
    isOrSearch: boolean;
};

export type SearchState = {
    current: any;
    results: string[];
    flagged: string[];
    pinned: Dictionary<string[]>;
    isSearchingTerm: boolean;
    isSearchGettingMore: boolean;
    recent: {
        [x: string]: Search[];
    };
    matches: {
        [x: string]: string[];
    };
};

export type SearchParameter = {
	terms: string;
	is_or_search: boolean;
	time_zone_offset?: number;
	page: number;
	per_page: number;
	include_deleted_channels: boolean;
}
