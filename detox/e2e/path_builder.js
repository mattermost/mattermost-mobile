// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
const path = require('path');

const sanitizeFilename = require('sanitize-filename');

const SANITIZE_OPTIONS = {replacement: '_'};
const sanitize = (filename) => sanitizeFilename(filename, SANITIZE_OPTIONS);

class CustomPathBuilder {
    constructor({rootDir}) {
        this.rootDir = rootDir;
    }

    buildPathForTestArtifact(artifactName, testSummary = null) {
        const fullName = (testSummary && testSummary.fullName.trim()) || '';
        const testFile = (testSummary && testSummary.testFilePath) || '';
        const sanitizedTestFile = sanitize(path.basename(testFile, '.ts'));
        const sanitizedTestName = sanitize(fullName);
        const sanitizedArtifactName = sanitize(artifactName);
        return path.join(
            'artifacts',
            'jest-stare',
            'screenshots',
            sanitizedTestFile,
            sanitizedTestName,
            `${sanitizedArtifactName}.png`,
        );
    }
}

module.exports = ({rootDir}) => {
    return new CustomPathBuilder({rootDir});
};
