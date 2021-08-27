// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Splits up latex code in an array consisting of each line of latex code.
 */
export function splitLatexCodeInLines(content: string): Array<string> {
    let outLines = content.split('\\\\');

    let i = 0;
    while (i < outLines.length) {
        if (outLines[i].split('{').length === outLines[i].split('}').length) { //Line has no linebreak in between brackets
            i += 1;
        } else if (i < outLines.length - 2) {
            outLines = outLines.slice(0, i).concat([outLines[i] + outLines[i + 1]], outLines.slice(i + 2));
        } else if (i === outLines.length - 2) {
            outLines = outLines.slice(0, i).concat([outLines[i] + outLines[i + 1]]);
        } else {
            return outLines;
        }
    }

    return outLines;
}
