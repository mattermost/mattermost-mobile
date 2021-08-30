// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-useless-escape */

import {splitLatexCodeInLines} from './latex';

describe('LatexUtilTest', () => {
    test('Simple lines test', () => {
        const content = '\\frac{1}{2} = 0.5 \\\\ \\pi == 3';

        const result = splitLatexCodeInLines(content);

        expect(result.length).toEqual(2);
        expect(result[0]).toEqual('\\frac{1}{2} = 0.5');
        expect(result[1]).toEqual('\\pi == 3');
    });

    test('Multi line with cases test', () => {
        const content = `b_n=\\frac{1}{\\pi}\\int\\limits_{-\\pi}^{\\pi}f(x)\\sin nx\\,\\mathrm{d}x=\\frac{1}{\\pi}\\int\\limits_{-\\pi}^{\\pi}x^2\\sin nx\\,\\mathrm{d}x\\\\
X(m, n) = \\left.
\\begin{cases}
x(n), & \\text{for } 0 \\leq n \\leq 1 \\\\
x(n - 1), & \\text{for } 0 \\leq n \\leq 1 \\\\
x(n - 1), & \\text{for } 0 \\leq n \\leq 1
\\end{cases} \\right\\} = xy\\\\
\\lim_{a\\to \\infty} \\tfrac{1}{a}\\\\
\\lim_{a \\underset{>}{\\to} 0} \\frac{1}{a}\\\\
x = a_0 + \\frac{1}{a_1 + \\frac{1}{a_2 + \\frac{1}{a_3 + a_4}}}`;

        const result = splitLatexCodeInLines(content);

        expect(result.length).toEqual(5);
        expect(result[0]).toEqual('b_n=\\frac{1}{\\pi}\\int\\limits_{-\\pi}^{\\pi}f(x)\\sin nx\\,\\mathrm{d}x=\\frac{1}{\\pi}\\int\\limits_{-\\pi}^{\\pi}x^2\\sin nx\\,\\mathrm{d}x');
        expect(result[1]).toEqual(`X(m, n) = \\left.
\\begin{cases}
x(n), & \\text{for } 0 \\leq n \\leq 1 \\\\
x(n - 1), & \\text{for } 0 \\leq n \\leq 1 \\\\
x(n - 1), & \\text{for } 0 \\leq n \\leq 1
\\end{cases} \\right\\} = xy`);
        expect(result[2]).toEqual('\\lim_{a\\to \\infty} \\tfrac{1}{a}');
        expect(result[3]).toEqual('\\lim_{a \\underset{>}{\\to} 0} \\frac{1}{a}');
        expect(result[4]).toEqual('x = a_0 + \\frac{1}{a_1 + \\frac{1}{a_2 + \\frac{1}{a_3 + a_4}}}');
    });

    test('Escaped bracket test', () => {
        const content = 'test = \\frac{1\\{}{2} = \\alpha \\\\ line = 2';

        const result = splitLatexCodeInLines(content);

        expect(result.length).toEqual(2);
        expect(result[0]).toEqual('test = \\frac{1\\{}{2} = \\alpha');
        expect(result[1]).toEqual('line = 2');
    });

    test('Escaped begin and end statement', () => {
        const content = 'test = \\\\begin \\\\ line = 2';

        const result = splitLatexCodeInLines(content);

        expect(result.length).toEqual(3);
        expect(result[0]).toEqual('test =');
        expect(result[1]).toEqual('begin');
        expect(result[2]).toEqual('line = 2');
    });
});
