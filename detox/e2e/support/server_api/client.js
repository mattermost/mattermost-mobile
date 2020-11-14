// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import axios from 'axios';

import testConfig from '../test_config';

export const client = axios.create({
    baseURL: testConfig.siteUrl,
    headers: {'X-Requested-With': 'XMLHttpRequest'},
});

export default client;
