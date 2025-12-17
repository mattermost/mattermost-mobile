#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Script to apply 16KB page size compatibility patches from a diff file.
 * This automates the process of updating dependencies and applying code changes
 * for Android 16KB page size support.
 *
 * Usage:
 *   node scripts/apply-16kb-pagesize-patch.js <diff-file> [--dry-run|--apply]
 *
 * Example:
 *   node scripts/apply-16kb-pagesize-patch.js 9325-full.diff --apply
 */

const {execSync} = require('child_process');
const fs = require('fs');

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

// Files to apply from the diff (excluding node_modules and package-lock.json)
// git apply will handle everything including file renames
const FILES_TO_EXCLUDE = [
    'node_modules/*',
    'package-lock.json',
];

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, color = 'reset') {
    // eslint-disable-next-line no-console
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command, options = {}) {
    try {
        return execSync(command, {
            encoding: 'utf8',
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options,
        });
    } catch (error) {
        if (!options.ignoreError) {
            throw error;
        }

        return null;
    }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

function applyDiffChanges(diffPath, dryRun) {
    log('\n📝 Applying changes from diff file', 'bright');

    if (!fs.existsSync(diffPath)) {
        log(`✗ Diff file not found: ${diffPath}`, 'red');
        process.exit(1);
    }

    if (dryRun) {
        log('   [DRY RUN] Would apply all changes using git apply', 'yellow');
        log('   (excluding node_modules and package-lock.json)', 'yellow');
        return;
    }

    try {
        log('   Applying all changes (including file renames)...', 'cyan');

        // Build exclude arguments
        const excludeArgs = FILES_TO_EXCLUDE.map((pattern) => `--exclude='${pattern}'`).join(' ');

        // Apply the diff, excluding node_modules and package-lock.json
        exec(`git apply ${excludeArgs} ${diffPath}`, {silent: true});

        log('   ✓ All changes applied successfully', 'green');
        log('   ✓ Patch files renamed automatically', 'green');
    } catch (error) {
        log(`   ✗ Failed to apply diff: ${error.message}`, 'red');
        throw error;
    }
}

function installUpdatedPackages(diffPath, dryRun) {
    log('\n📦 Installing updated packages', 'bright');

    if (dryRun) {
        log('   [DRY RUN] Would run: npm install --ignore-scripts', 'yellow');
        return;
    }

    try {
        // Read package.json to get the list of changed packages
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const dependencies = {...packageJson.dependencies, ...packageJson.devDependencies};

        // Extract package names from diff
        const diffContent = fs.readFileSync(diffPath, 'utf8');
        const packageChanges = [];
        const lines = diffContent.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Look for package.json dependency changes
            if (line.startsWith('+    "expo') || line.startsWith('-    "expo')) {
                const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
                if (match && line.startsWith('+')) {
                    const [, pkgName] = match;
                    if (dependencies[pkgName] && !packageChanges.includes(pkgName)) {
                        packageChanges.push(pkgName);
                    }
                }
            }
        }

        if (packageChanges.length > 0) {
            log(`   Installing ${packageChanges.length} updated packages...`, 'cyan');
            log(`   Packages: ${packageChanges.join(', ')}`, 'cyan');

            // Install only the changed packages to update package-lock.json
            exec(`npm install ${packageChanges.join(' ')} --ignore-scripts`);
            log('   ✓ Packages installed successfully', 'green');
        } else {
            log('   ℹ️  No package changes detected', 'yellow');
        }
    } catch (error) {
        log(`   ✗ Failed to install packages: ${error.message}`, 'red');
        throw error;
    }
}

function applyPatchFiles(dryRun) {
    log('\n🔧 Applying patch files', 'bright');

    if (dryRun) {
        log('   [DRY RUN] Would run: npx patch-package', 'yellow');
        return;
    }

    try {
        exec('npx patch-package');
        log('   ✓ Patch files applied successfully', 'green');
    } catch (error) {
        log(`   ✗ Failed to apply patch files: ${error.message}`, 'red');
        throw error;
    }
}

function showSummary(dryRun) {
    log('\n' + '='.repeat(70), 'cyan');
    if (dryRun) {
        log('DRY RUN COMPLETE', 'bright');
        log('Run with --apply to actually apply the changes', 'yellow');
    } else {
        log('✓ ALL CHANGES APPLIED SUCCESSFULLY', 'green');
        log('\nNext steps:', 'bright');
        log('1. Review the changes with: git diff', 'cyan');
        log('2. Test the build to ensure everything works', 'cyan');
        log('3. Commit the changes if satisfied', 'cyan');
    }

    log('='.repeat(70), 'cyan');
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        log('Usage: node scripts/apply-16kb-pagesize-patch.js <diff-file> [--dry-run|--apply]', 'bright');
        log('\nOptions:', 'bright');
        log('  --dry-run    Preview changes without applying them (default)', 'cyan');
        log('  --apply      Actually apply the changes', 'cyan');
        log('  --help, -h   Show this help message', 'cyan');
        log('\nExample:', 'bright');
        log('  node scripts/apply-16kb-pagesize-patch.js 9325-full.diff --apply', 'cyan');
        process.exit(0);
    }

    const diffPath = args[0];
    const dryRun = !args.includes('--apply');

    log('\n' + '='.repeat(70), 'cyan');
    log('16KB PAGE SIZE PATCH APPLICATION', 'bright');
    log('='.repeat(70), 'cyan');
    log(`Diff file: ${diffPath}`, 'cyan');
    log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`, dryRun ? 'yellow' : 'green');
    log('='.repeat(70), 'cyan');

    try {
        // Step 1: Apply diff changes using git apply (handles renames automatically)
        applyDiffChanges(diffPath, dryRun);

        // Step 2: Install updated packages
        installUpdatedPackages(diffPath, dryRun);

        // Step 3: Apply patch files
        applyPatchFiles(dryRun);

        // Show summary
        showSummary(dryRun);
    } catch (error) {
        log('\n✗ Script failed with error:', 'red');
        log(error.message, 'red');
        process.exit(1);
    }
}

main();
