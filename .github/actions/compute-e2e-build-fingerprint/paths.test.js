'use strict';

const {loadPaths, fingerprintPathsForPlatform, impactGlobs, fingerprintPathToGlob} = require('./paths');

describe('e2e impact paths', () => {
    const paths = loadPaths();

    it('should list fingerprint paths for each known platform', () => {
        for (const platform of ['ios', 'android-detox', 'android-maestro']) {
            const list = fingerprintPathsForPlatform(paths, platform);
            expect(list.length).toBeGreaterThan(paths.fingerprintShared.length);
            expect(list).toEqual(expect.arrayContaining(paths.fingerprintShared));
        }
    });

    it('should reject unknown platforms', () => {
        expect(() => fingerprintPathsForPlatform(paths, 'windows')).toThrow(/Unknown platform/);
    });

    it('should convert fingerprint dirs to globs so the impact filter covers them', () => {
        expect(fingerprintPathToGlob('app/')).toBe('app/**');
        expect(fingerprintPathToGlob('package.json')).toBe('package.json');
        expect(fingerprintPathToGlob('scripts/')).toBe('scripts/**');
    });

    it('should include every fingerprint path in the impact globs (no drift)', () => {
        const globs = new Set(impactGlobs(paths));
        const fingerprintEntries = [
            ...paths.fingerprintShared,
            ...Object.values(paths.fingerprintByPlatform).flat(),
        ];
        for (const entry of fingerprintEntries) {
            expect(globs.has(fingerprintPathToGlob(entry))).toBe(true);
        }
    });

    it('should keep test-only and sharding infra in triggerExtra (run E2E, not fingerprint)', () => {
        expect(paths.triggerExtra).toEqual(expect.arrayContaining([
            'detox/e2e/**',
            'detox/maestro/**',
            'detox/utils/**',
            '.github/actions/generate-specs/**',
            '.github/actions/s3-spec-durations/**',
        ]));
        for (const extra of paths.triggerExtra) {
            expect(paths.fingerprintShared).not.toContain(extra.replace(/\/\*\*$/, '/'));
        }
    });

    it('should fingerprint scripts/ wholesale so postinstall and friends invalidate cache', () => {
        expect(paths.fingerprintShared).toContain('scripts/');
        expect(impactGlobs(paths)).toContain('scripts/**');
    });
});
