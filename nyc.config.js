// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
module.exports = {
    'check-coverage': false,
    lines: 95,
    statements: 95,
    functions: 95,
    branches: 95,
    include: [
        'app/**/*.{js,ts,jsx,tsx}',
    ],
    exclude: [
        '**/common/lib/**',
        '**/lib/handlers.js',
        '**/internal/registry/**',
        'packages/database/lib/DatabaseSyncTree.js',
    ],
    cwd: '..',
    sourceMap: false,
    instrument: false,
    reporter: ['lcov', 'html', 'text-summary'],
};
