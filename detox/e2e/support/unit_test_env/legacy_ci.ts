// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Imported first by a unit test, before server_role reads the environment: the legacy CI pipeline, where provisioning
// owns server setup and specs only verify it.
process.env.CI = 'true';
delete process.env.E2E_PIPELINE;
delete process.env.E2E_SERVER_ROLE;
delete process.env.E2E_POOL_GUARD;
