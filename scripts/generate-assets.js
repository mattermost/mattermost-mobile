// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

const fs = require('fs');
const fsPath = require('path');

// Takes the files in rootA/path, overwrites or merges them with the corresponding file in rootB/path, and places the
// resulting file in dest/path. JSON files that exist in both places are shallowly (TODO maybe deeply) merged and all
// other types of files are overwritten.
function leftMergeDirs(rootA, rootB, dest, path) {
    const pathA = rootA + path;
    const pathB = rootB + path;

    try {
        fs.mkdirSync(dest + path, {recursive: true});
    } catch (e) {
        if (e.code !== 'EEXIST') {
            console.error('Failed to create destination dir ' + dest + path);
            console.log(e);
            throw e;
        }
    }

    for (const file of fs.readdirSync(pathA)) {
        const filePathA = pathA + file;
        const filePathB = pathB + file;

        let stat;
        try {
            stat = fs.statSync(filePathA);
        } catch (e) {
            console.error('File ' + file + ' doesn\'t exist in ' + pathA);
            throw e;
        }

        if (stat.isDirectory()) {
            leftMergeDirs(rootA, rootB, dest, path + file + '/');
        } else {
            let fileA;
            try {
                fileA = fs.readFileSync(filePathA);
            } catch (e) {
                console.error('Failed to read ' + filePathA);
                throw e;
            }

            const outPath = dest + path + file;
            let out;
            try {
                out = fs.createWriteStream(outPath);
            } catch (e) {
                console.error('Failed to open output file ' + dest + path + file);
                throw e;
            }

            let fileB = null;
            try {
                fileB = fs.readFileSync(filePathB);
            } catch (e) {
                // do nothing
            }

            if (fileB) {
                if (file.endsWith('.json')) {
                    // We need to merge these files
                    const objA = JSON.parse(fileA);
                    const objB = JSON.parse(fileB);

                    console.log('Merging ' + filePathA + ' with ' + filePathB + ' into ' + outPath);
                    out.write(JSON.stringify(Object.assign({}, objA, objB)));
                } else {
                    // Copy fileB instead of fileA
                    console.log('Copying ' + filePathB + ' from override to ' + outPath);
                    out.write(fileB);
                }
            } else {
                // Copy fileA to the destination
                console.log('Copying ' + filePathA + ' from base to ' + outPath);
                out.write(fileA);
            }
        }
    }
}

const rmdir = (path) => {
    const list = fs.readdirSync(path);
    for (let i = 0; i < list.length; i++) {
        const filename = fsPath.join(path, list[i]);
        const stat = fs.statSync(filename);

        if (stat.isDirectory()) {
            rmdir(filename);
        } else {
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(path);
};

if (fs.existsSync('dist')) {
    rmdir('dist');
}

// Assumes dist/assets exists and is empty
leftMergeDirs('assets/base/', 'assets/override/', 'dist/assets/', '');
/* eslint-enable no-console */
