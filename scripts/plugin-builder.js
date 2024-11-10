// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-exit */
/* eslint-disable no-console */

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 1) {
    console.log('Usage: node builder.js plugin-directory');
    process.exit(1);
}

const inputDir = `dev-plugins/${args[0]}`;
const outputDir = `${inputDir}/dist`;

const omit = [
    '@assets/*',
    '@actions/*',
    '@products/*',
    '@components/*',
    '@constants',
    '@constants/*',
    '@context/*',
    '@database/*',
    '@helpers/*',
    '@hooks/*',
    '@i18n/*',
    '@init/*',
    '@managers/*',
    '@plugins/*',
    '@queries/*',
    '@screens/*',
    '@store/*',
    '@utils/*',
    '@typings/*',
].map((dep) => `--external:${dep}`).join(' ');

function replaceRequirePaths(code) {
    return code.replace(/require\((["'])(\.\.\/)+(app\/)?/g, 'require($1@');
}

async function fixRequirePaths(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, 'utf-8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            const modifiedData = replaceRequirePaths(data);
            fs.writeFile(file, modifiedData, 'utf-8', (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    });
}

async function processFiles(directory) {
    return new Promise((resolve, reject) => {
        const promises = [];
        fs.readdir(directory, async (err, files) => {
            if (err) {
                reject(err);
                return;
            }

            for (const file of files) {
                const fullPath = path.join(directory, file);
                promises.push(fixRequirePaths(fullPath));
            }

            await Promise.all(promises);
            resolve();
        });
    });
}

function deleteFilesExcept(directory, keepFile) {
    const emptyFunction = () => {
        // empty
    };
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error(`Failed to read directory: ${err}`);
            return;
        }

        files.forEach((file) => {
            // Skip the file we want to keep
            if (file === keepFile) {
                return;
            }

            const filePath = path.join(directory, file);

            fs.unlink(filePath, emptyFunction);
        });
    });
}

async function main() {
    execSync(`rm -rf ${outputDir}`);
    execSync(`npx babel --extensions .ts,.tsx,.jsx,.js ${inputDir} --out-dir ${outputDir}`);
    await processFiles(outputDir);

    execSync(`npx esbuild ${outputDir} --bundle --outfile=${outputDir}/bundle.js --platform=node --packages=external --format=cjs --minify --banner:js="" ${omit}`, {stdio: 'inherit'});
    deleteFilesExcept(outputDir, 'bundle.js');
}

main();
