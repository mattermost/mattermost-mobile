// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable no-console */

var fs = require('fs');

// Takes the files in rootA/path, overwrites or merges them with the corresponding file in rootB/path, and places the
// resulting file in dest/path. JSON files that exist in both places are shallowly (TODO maybe deeply) merged and all
// other types of files are overwritten.
function leftMergeDirs(rootA, rootB, dest, path) {
    var pathA = rootA + path;
    var pathB = rootB + path;

    try {
        fs.mkdirSync(dest + path);
    } catch (e) {
        if (e.code !== 'EEXIST') {
            console.error('Failed to create destination dir ' + dest + path);
            console.log(e);
            throw e;
        }
    }

    for (var file of fs.readdirSync(pathA)) {
        var filePathA = pathA + file;
        var filePathB = pathB + file;

        var stat;
        try {
            stat = fs.statSync(filePathA);
        } catch (e) {
            console.error('File ' + file + ' doesn\'t exist in ' + pathA);
            throw e;
        }

        if (stat.isDirectory()) {
            leftMergeDirs(rootA, rootB, dest, path + file + '/');
        } else {
            var fileA;
            try {
                fileA = fs.readFileSync(filePathA);
            } catch (e) {
                console.error('Failed to read ' + filePathA);
                throw e;
            }

            var outPath = dest + path + file;
            var out;
            try {
                out = fs.createWriteStream(outPath);
            } catch (e) {
                console.error('Failed to open output file ' + dest + path + file);
                throw e;
            }

            var fileB = null;
            try {
                fileB = fs.readFileSync(filePathB);
            } catch (e) {
                // do nothing
            }

            if (fileB) {
                if (file.endsWith('.json')) {
                    // We need to merge these files
                    var objA = JSON.parse(fileA);
                    var objB = JSON.parse(fileB);

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

function mergeThemeOverrides(source, override, dest) {
    var themeA = fs.readFileSync(source);

    var themeB;
    try {
        themeB = fs.readFileSync(override);
    } catch (error) {
        // override theme doesn't exist
        return;
    }

    var objA = JSON.parse(themeA);
    var objB = JSON.parse(themeB);

    var nextObj = {};
    Object.keys(objA).forEach((t) => {
        nextObj[t] = Object.assign({}, objA[t], objB[t]);
        Reflect.deleteProperty(objB, t);
    });

    var finalObj = Object.assign({}, nextObj, objB);

    var out = fs.createWriteStream(dest);
    out.write(JSON.stringify(finalObj));
}

// Assumes dist/assets exists and is empty
leftMergeDirs('assets/base/', 'assets/override/', 'dist/assets/', '');
mergeThemeOverrides('assets/base/themes.json', 'assets/override/themes.json', 'dist/assets/themes.json');
/* eslint-enable no-console */
