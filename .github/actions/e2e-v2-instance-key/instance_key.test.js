'use strict';

const {instanceKey, scopeLabel, MAX_LENGTH} = require('./instance_key');

describe('e2e v2 instance_key', () => {
    it('should format a PR key as mobile-pr-<n>-<run_number>', () => {
        expect(instanceKey({prNumber: '1234', runNumber: '99'})).toBe('mobile-pr-1234-99');
    });

    it('should format main, release, and release-cut keys', () => {
        expect(instanceKey({runType: 'MAIN', runNumber: '12'})).toBe('mobile-main-12');
        expect(instanceKey({runType: 'MASTER', runNumber: '12'})).toBe('mobile-main-12');
        expect(instanceKey({runType: 'RELEASE', runNumber: '12'})).toBe('mobile-release-12');
        expect(instanceKey({runType: 'RELEASE_CUT', runNumber: '12'})).toBe('mobile-release-cut-12');
    });

    it('should prefer the PR number over run type', () => {
        expect(instanceKey({prNumber: '10054', runType: 'MAIN', runNumber: '7'})).toBe('mobile-pr-10054-7');
    });

    it('should strip non-digits from the PR number', () => {
        expect(scopeLabel({prNumber: 'PR #10054'})).toBe('pr-10054');
    });

    it('should infer scope from the branch when run type is unset', () => {
        expect(scopeLabel({refName: 'main'})).toBe('main');
        expect(scopeLabel({refName: 'release-2.40'})).toBe('release');
        expect(scopeLabel({refName: 'release-cut'})).toBe('release-cut');
    });

    it('should stay within the toolkit hostname prefix limit', () => {
        expect(instanceKey({prNumber: '10054', runNumber: '123456'}).length).toBeLessThanOrEqual(MAX_LENGTH);
        expect(instanceKey({runType: 'RELEASE_CUT', runNumber: '12345'}).length).toBeLessThanOrEqual(MAX_LENGTH);
    });

    it('should reject a missing run number', () => {
        expect(() => instanceKey({prNumber: '1234'})).toThrow(/run_number/);
    });

    it('should reject a key longer than 24 characters', () => {
        expect(() => instanceKey({runType: 'RELEASE_CUT', runNumber: '123456'})).toThrow(/24/);
    });

    it('should reject an unknown scope', () => {
        expect(() => instanceKey({refName: 'cursor/e2e', runNumber: '1'})).toThrow(/PR number/);
    });
});
