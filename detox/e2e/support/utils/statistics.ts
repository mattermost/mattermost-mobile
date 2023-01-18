// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Adapted from https://www.math.ucla.edu/~tom/distributions/tDist.html

/* eslint-disable no-mixed-operators */

function logGamma(Z: number) {
    const S = 1 + 76.18009173 / Z - 86.50532033 / (Z + 1) + 24.01409822 / (Z + 2) - 1.231739516 / (Z + 3) + 0.00120858003 / (Z + 4) - 0.00000536382 / (Z + 5);
    const LG = (Z - 0.5) * Math.log(Z + 4.5) - (Z + 4.5) + Math.log(S * 2.50662827465);
    return LG;
}

function betinc(X: number, A: number, B: number) {
    let A0 = 0;
    let B0 = 1;
    let A1 = 1;
    let B1 = 1;
    let M9 = 0;
    let A2 = 0;
    let C9;
    while (Math.abs((A1 - A2) / A1) > 0.00001) {
        A2 = A1;
        C9 = -(A + M9) * (A + B + M9) * X / (A + 2 * M9) / (A + 2 * M9 + 1);
        A0 = A1 + C9 * A0;
        B0 = B1 + C9 * B0;
        M9 += 1;
        C9 = M9 * (B - M9) * X / (A + 2 * M9 - 1) / (A + 2 * M9);
        A1 = A0 + C9 * A1;
        B1 = B0 + C9 * B1;
        A0 /= B1;
        B0 /= B1;
        A1 /= B1;
        B1 = 1;
    }
    return A1 / A;
}

function computeAlpha(T: number, df: number) {
    const A = df / 2;
    const S = A + 0.5;
    const Z = df / (df + T * T);
    const BT = Math.exp(logGamma(S) - logGamma(0.5) - logGamma(A) + A * Math.log(Z) + 0.5 * Math.log(1 - Z));
    let betacdf;
    if (Z < (A + 1) / (S + 2)) {
        betacdf = BT * betinc(Z, A, 0.5);
    } else {
        betacdf = 1 - BT * betinc(1 - Z, 0.5, A);
    }
    let tcdf;
    if (T < 0) {
        tcdf = betacdf / 2;
    } else {
        tcdf = 1 - betacdf / 2;
    }
    tcdf = Math.round(tcdf * 100000) / 100000;
    return tcdf;
}

// New code

function computeT(av1: number, av2: number, s1: number, s2: number, n1: number, n2: number) {
    const num = (av1 - av2);
    const leftTermNum = (n1 - 1) * s1 + (n2) * s2;
    const leftTermDen = n1 + n2 - 2;
    const leftTerm = leftTermNum / leftTermDen;
    const rightTerm = (1 / n1) + (1 / n2);
    const den = Math.sqrt(leftTerm * rightTerm);
    const T = Math.abs(num / den);
    return T;
}

function computeStatsFromData(data: number[], baseline?: {average: number; quasivariance: number; n: number}, significance?: number) {
    const average = data.reduce((acc, v) => acc + v, 0) / data.length;
    const quasiVariance = data.reduce((acc, v) => acc + Math.pow(v - average, 2), 0) / (data.length - 1);
    let T: number |undefined;
    let alpha: number | undefined;
    let pass: boolean | undefined;
    if (baseline) {
        T = computeT(baseline.average, average, baseline.quasivariance, quasiVariance, baseline.n, data.length);
        alpha = computeAlpha(T, baseline.n + data.length - 2);
        if (significance) {
            pass = alpha < (1 - (significance / 2));
        }
    }
    return {average, quasiVariance, T, alpha, pass};
}

export function checkWithBaseline(data: number[], baseline?: {average: number; quasivariance: number; n: number}) {
    const {average, quasiVariance, alpha, pass} = computeStatsFromData(data, baseline, 0.10);
    if (pass) {
        // eslint-disable-next-line no-console
        console.log('PASSED with alpha', alpha);
    } else {
        throw new Error(`Failed with values average=${average} quasivariance=${quasiVariance} alpha=${alpha}`);
    }
}
