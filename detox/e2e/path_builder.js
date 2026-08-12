// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const path = require('path');

const sanitizeFilename = require('sanitize-filename');

const SANITIZE_OPTIONS = {replacement: '_'};

// `/` is illegal in filesystem paths. sanitize-filename turns it into `_`, which
// breaks Test System IO screenshot linking (folder basename must match Jest fullName).
// Use U+2215 DIVISION SLASH so the folder stays unique and Test System IO can reverse it.
const PATH_SEP_TOKEN = '\u2215';
const sanitize = (filename) => sanitizeFilename(
    String(filename).replaceAll('/', PATH_SEP_TOKEN),
    SANITIZE_OPTIONS,
);

class CustomPathBuilder {
    constructor({rootDir}) {
        this.rootDir = rootDir;
    }

    buildPathForTestArtifact(artifactName, testSummary = null) {
        const fullName = (testSummary && testSummary.fullName) || '';
        const segments = [this.rootDir, sanitize(fullName), sanitize(artifactName)];
        return path.join(...segments.filter(Boolean));
    }
}

module.exports = ({rootDir}) => {
    return new CustomPathBuilder({rootDir});
};
