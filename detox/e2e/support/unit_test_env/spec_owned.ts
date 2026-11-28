// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Imported first by a unit test, before server_role reads the environment: the v2 pipeline, where specs own server setup.
process.env.E2E_PIPELINE = 'v2';
