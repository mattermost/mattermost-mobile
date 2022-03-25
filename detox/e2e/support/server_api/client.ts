// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import axios from 'axios';
import {wrapper} from 'axios-cookiejar-support';
import {CookieJar} from 'tough-cookie';

const jar = new CookieJar();
export const client = wrapper(axios.create({
    headers: {'X-Requested-With': 'XMLHttpRequest'},
    jar,
}));

export default client;
