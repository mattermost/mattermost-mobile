// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dictionary} from '@mm-redux/types/utilities';

export type Search = {
    terms: string;
    isOrSearch: boolean;
};

export type SearchState = {
    current: any;
    results: Array<string>;
    flagged: Array<string>;
    pinned: Dictionary<Array<string>>;
    isSearchingTerm: boolean;
    isSearchGettingMore: boolean;
    recent: {
        [x: string]: Array<Search>;
    };
    matches: {
        [x: string]: Array<string>;
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
