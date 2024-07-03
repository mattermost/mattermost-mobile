// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
module.exports = {
    'check-coverage': false,
    lines: 95,
    statements: 95,
    functions: 95,
    branches: 95,
    include: ['**/*.js', '**/*.ts', '**/*.tsx'],
    exclude: [

        // Add excludes here.
    ],

    // cwd: '..',
    cwd: '.',
    sourceMap: false,
    instrument: false,
    reporter: ['lcov', 'html', 'text-summary'],
};
