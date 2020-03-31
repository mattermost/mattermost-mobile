// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable global-require, no-process-env */
const config = process.env.NODE_ENV === 'production' ? require('./configureStore.prod').default : require('./configureStore.dev').default;
export default config;
