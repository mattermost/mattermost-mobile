// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console, consistent-return, no-process-env */

const fs = require('fs');
const path = require('path');

const {S3} = require('@aws-sdk/client-s3');
const {Upload} = require('@aws-sdk/lib-storage');
const async = require('async');
const mime = require('mime-types');
const readdir = require('recursive-readdir');

const {ARTIFACTS_DIR} = require('./constants');

require('dotenv').config();

const {
    DETOX_AWS_S3_BUCKET,
    DETOX_AWS_ACCESS_KEY_ID,
    DETOX_AWS_SECRET_ACCESS_KEY,
    REPORT_PATH,
} = process.env;

const s3 = new S3({
    credentials: {
        accessKeyId: DETOX_AWS_ACCESS_KEY_ID,
        secretAccessKey: DETOX_AWS_SECRET_ACCESS_KEY,
    },
});

function getFiles(dirPath) {
    return fs.existsSync(dirPath) ? readdir(dirPath) : [];
}

async function saveArtifacts(platform) {
    if (!DETOX_AWS_S3_BUCKET || !DETOX_AWS_ACCESS_KEY_ID || !DETOX_AWS_SECRET_ACCESS_KEY) {
        console.log('No AWS credentials found. Test artifacts not uploaded to S3.');

        return;
    }

    const uploadPath = path.resolve(__dirname, `../${ARTIFACTS_DIR}`);
    const filesToUpload = await getFiles(uploadPath);

    return new Promise((resolve, reject) => {
        async.eachOfLimit(
            filesToUpload,
            10,
            async.asyncify(async (file) => {
                // Skip Maestro CLI's own copyright/config files (they're copied in
                // by the maestro workflow's `fse.copySync('../build', ...)`) — they
                // are not test artifacts and were noisy "Failed to upload artifact"
                // lines in the maestro CI log.
                if (file.includes(`${path.sep}notice-file${path.sep}`)) {
                    return {success: true};
                }

                const Key = file.replace(uploadPath, REPORT_PATH);
                const contentType = mime.lookup(file);
                const charset = mime.charset(contentType);

                try {
                    await new Upload({
                        client: s3,
                        params: {
                            Key,
                            Bucket: DETOX_AWS_S3_BUCKET,
                            Body: fs.readFileSync(file),
                            ContentType: `${contentType}${charset ? '; charset=' + charset : ''}`,
                        },
                    }).done();
                    return {success: true};
                } catch (e) {
                    console.log('Failed to upload artifact:', file);
                    throw new Error(e);
                }
            }),
            (err) => {
                if (err) {
                    console.log('Failed to upload artifacts');
                    return reject(new Error(err));
                }

                // Detox runs use jest-stare to produce an HTML report; maestro
                // produces its own HTML via generateMaestroHtmlReport(). Pick the
                // right URL so the logged "Uploaded:" line points at a file that
                // actually exists.
                const isMaestro = platform.startsWith('maestro-');
                const reportLink = isMaestro ?
                    `https://${DETOX_AWS_S3_BUCKET}.s3.amazonaws.com/${REPORT_PATH}/${platform}/maestro-report.html` :
                    `https://${DETOX_AWS_S3_BUCKET}.s3.amazonaws.com/${REPORT_PATH}/jest-stare/${platform}-report.html`;
                resolve({success: true, reportLink});
            },
        );
    });
}

module.exports = {saveArtifacts};
