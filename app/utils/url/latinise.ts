// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
// Credit to http://semplicewebsites.com/removing-accents-javascript

import {latinMap} from './latin_map';

export function map(x: string) {
    return latinMap[x] || x;
}

export function latinise(input: string) {
    return input.replace(/[^A-Za-z0-9]/g, map);
}
