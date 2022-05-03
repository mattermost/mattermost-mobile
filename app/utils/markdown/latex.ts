// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Splits up latex code in an array consisting of each line of latex code.
 * A latex linebreak is denoted by `\\`.
 * A line is not broken in 2 cases:
 * - The linebreak is in between brackets.
 * - The linebreak occurs inbetween a `\begin` and `\end` statement.
 */

export function splitLatexCodeInLines(content: string): string[] {
    let outLines = content.split('\\\\');

    let i = 0;
    while (i < outLines.length) {
        if (testLatexLineBreak(outLines[i])) { //Line has no linebreak in between brackets
            i += 1;
        } else if (i < outLines.length - 2) {
            outLines = outLines.slice(0, i).concat([outLines[i] + '\\\\' + outLines[i + 1]], outLines.slice(i + 2));
        } else if (i === outLines.length - 2) {
            outLines = outLines.slice(0, i).concat([outLines[i] + '\\\\' + outLines[i + 1]]);
        } else {
            break;
        }
    }

    return outLines.map((line) => line.trim());
}

function testLatexLineBreak(latexCode: string): boolean {
    /**
     * These checks are special because they need to check if the braces and statements are not escaped
     */

    //Check for cases
    let beginCases = 0;
    let endCases = 0;

    let i = 0;
    while (i < latexCode.length) {
        const firstBegin = latexCode.indexOf('\\begin{', i);
        const firstEnd = latexCode.indexOf('\\end{', i);

        if (firstBegin === -1 && firstEnd === -1) {
            break;
        }

        if (firstBegin !== -1 && (firstBegin < firstEnd || firstEnd === -1)) {
            if (latexCode[firstBegin - 1] !== '\\') {
                beginCases += 1;
            }
            i = firstBegin + '\\begin{'.length;
        } else {
            if (latexCode[firstEnd - 1] !== '\\') {
                endCases += 1;
            }
            i = firstEnd + '\\end{'.length;
        }
    }

    if (beginCases !== endCases) {
        return false;
    }

    //Check for braces
    let curlyOpenCases = 0;
    let curlyCloseCases = 0;

    i = 0;
    while (i < latexCode.length) {
        const firstBegin = latexCode.indexOf('{', i);
        const firstEnd = latexCode.indexOf('}', i);

        if (firstBegin === -1 && firstEnd === -1) {
            break;
        }

        if (firstBegin !== -1 && (firstBegin < firstEnd || firstEnd === -1)) {
            if (latexCode[firstBegin - 1] !== '\\') {
                curlyOpenCases += 1;
            }
            i = firstBegin + 1;
        } else {
            if (latexCode[firstEnd - 1] !== '\\') {
                curlyCloseCases += 1;
            }
            i = firstEnd + 1;
        }
    }

    if (curlyOpenCases !== curlyCloseCases) {
        return false;
    }

    return true;
}
