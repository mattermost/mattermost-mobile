// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

// Store the Promise class and setTimeout function because they get broken when React Native is imported into Jest
// https://github.com/facebook/jest/issues/1760
// https://github.com/facebook/react-native/issues/6104#issuecomment-245827616
const savedPromise = Promise;
const savedSetTimeout = setTimeout;

require('react-native');

Promise = savedPromise;
setTimeout = savedSetTimeout;