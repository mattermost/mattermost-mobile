'use strict';

const {instanceKey, scopeLabel, MAX_LENGTH} = require('./instance_key');

describe('e2e v2 instance_key', () => {
    it('should format a PR key as mobile-pr-<n>', () => {
        expect(instanceKey({prNumber: '1234'})).toBe('mobile-pr-1234');
    });

    it('should format main, release, and release-cut keys', () => {
        expect(instanceKey({runType: 'MAIN'})).toBe('mobile-main');
        expect(instanceKey({runType: 'MASTER'})).toBe('mobile-main');
        expect(instanceKey({runType: 'RELEASE'})).toBe('mobile-release');
        expect(instanceKey({runType: 'RELEASE_CUT'})).toBe('mobile-release-cut');
    });

    it('should prefer the PR number over run type', () => {
        expect(instanceKey({prNumber: '10054', runType: 'MAIN'})).toBe('mobile-pr-10054');
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
        expect(instanceKey({prNumber: '10054'}).length).toBeLessThanOrEqual(MAX_LENGTH);
        expect(instanceKey({runType: 'RELEASE_CUT'}).length).toBeLessThanOrEqual(MAX_LENGTH);
    });

    it('should reject an unknown scope', () => {
        expect(() => instanceKey({refName: 'cursor/e2e'})).toThrow(/PR number/);
    });
});
