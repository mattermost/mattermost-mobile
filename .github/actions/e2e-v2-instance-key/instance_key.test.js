'use strict';

const {instanceKey, scopeLabel, MAX_LENGTH} = require('./instance_key');

describe('e2e v2 instance_key', () => {
    it('should format a PR key as mobile-pr-<n>-<platform>', () => {
        expect(instanceKey({prNumber: '1234', platform: 'ios'})).toBe('mobile-pr-1234-ios');
        expect(instanceKey({prNumber: '1234', platform: 'android'})).toBe('mobile-pr-1234-and');
        expect(instanceKey({prNumber: '1234', platform: 'ipad'})).toBe('mobile-pr-1234-ipad');
        expect(instanceKey({prNumber: '1234', platform: 'maestro-ios'})).toBe('mobile-pr-1234-mios');
        expect(instanceKey({prNumber: '1234', platform: 'maestro-android'})).toBe('mobile-pr-1234-mand');
    });

    it('should format main, release, and release-cut keys', () => {
        expect(instanceKey({runType: 'MAIN', platform: 'ios'})).toBe('mobile-main-ios');
        expect(instanceKey({runType: 'MASTER', platform: 'android'})).toBe('mobile-main-and');
        expect(instanceKey({runType: 'RELEASE', platform: 'ipad'})).toBe('mobile-release-ipad');
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'ios'})).toBe('mobile-release-cut-ios');
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'android'})).toBe('mobile-release-cut-and');
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'ipad'})).toBe('mobile-release-cut-ipad');
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'maestro-ios'})).toBe('mobile-release-cut-mios');
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'maestro-android'})).toBe('mobile-release-cut-mand');
    });

    it('should prefer the PR number over run type', () => {
        expect(instanceKey({prNumber: '10054', runType: 'MAIN', platform: 'ios'})).toBe('mobile-pr-10054-ios');
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
        expect(instanceKey({prNumber: '10054', platform: 'ipad'}).length).toBeLessThanOrEqual(MAX_LENGTH);
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'ios'}).length).toBeLessThanOrEqual(MAX_LENGTH);
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'android'}).length).toBeLessThanOrEqual(MAX_LENGTH);
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'ipad'}).length).toBeLessThanOrEqual(MAX_LENGTH);
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'maestro-ios'}).length).toBeLessThanOrEqual(MAX_LENGTH);
        expect(instanceKey({runType: 'RELEASE_CUT', platform: 'maestro-android'}).length).toBeLessThanOrEqual(MAX_LENGTH);
    });

    it('should reject an unknown scope', () => {
        expect(() => instanceKey({refName: 'cursor/e2e', platform: 'ios'})).toThrow(/PR number/);
    });

    it('should reject a missing or unknown platform', () => {
        expect(() => instanceKey({prNumber: '1'})).toThrow(/platform/);
        expect(() => instanceKey({prNumber: '1', platform: 'macos'})).toThrow(/platform/);
    });
});
