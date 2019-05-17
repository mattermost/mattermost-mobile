// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Test server can be one or more instance, each of different release version
// where server compatibility is supported.
// Ranges from minimum supported version (e.g. 4.10) up to the latest.
const ANDROID_LOCAL_SERVER_URL = 'http://10.0.2.2:8065';
const IOS_LOCAL_SERVER_URL = 'http://localhost:8065';

const USER = {
    sysadmin: {username: 'sysadmin', password: 'sysadmin'},
    user1: {username: 'user-1', password: 'user-1'},
};

module.exports = {
    ANDROID_LOCAL_SERVER_URL,
    IOS_LOCAL_SERVER_URL,
    USER,
};
