// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import axios from 'axios';

export const client = axios.create({
    headers: {'X-Requested-With': 'XMLHttpRequest'},
});

export default client;
