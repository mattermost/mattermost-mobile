#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Script to apply 16KB page size compatibility patches from a diff file.
 * This automates the process of updating dependencies, renaming patch files,
 * and regenerating package-lock.json for Android 16KB page size support.
 */

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

// Correct patch file content for expo-image+2.4.1.patch
// This is the complete, correct content that should be in the patch file
const EXPO_IMAGE_PATCH_CONTENT = fs.readFileSync(path.join(__dirname, 'expo-image+2.4.1.patch'), 'utf8');

// ANSI color codes for pretty output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Parse a unified diff file and extract structured change information
 * @param {string} diffPath - Path to the diff file
 * @returns {Object} Parsed diff data
 */
function parseDiff(diffPath) {
    log('\n📖 Parsing diff file...', 'blue');

    const diffContent = fs.readFileSync(diffPath, 'utf8');
    const lines = diffContent.split('\n');

    const result = {
        packageJson: {
            dependencies: [],
        },
        patchFiles: {
            renames: [],
            contentChanges: [],
        },
        otherFiles: {},
    };

    let currentFile = null;
    let currentSection = [];
    let inPatchContent = false;
    let patchContentLines = [];
    let currentPatchFile = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect new file section
        if (line.startsWith('diff --git ')) {
            // Process previous section if exists
            if (currentFile && currentSection.length > 0) {
                processSection(currentFile, currentSection, result);
            }

            // Save patch content if we were collecting it
            if (inPatchContent && currentPatchFile) {
                result.patchFiles.contentChanges.push({
                    file: currentPatchFile,
                    content: patchContentLines.join('\n'),
                });
                inPatchContent = false;
                patchContentLines = [];
            }

            // Extract file paths from "diff --git a/path b/path"
            const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
            if (match) {
                const oldPath = match[1];
                const newPath = match[2];

                currentFile = {
                    oldPath,
                    newPath,
                    isRename: oldPath !== newPath,
                };
                currentSection = [line];
            }
        } else if (currentFile) {
            currentSection.push(line);

            // Check if this is a patch file rename
            if (line.startsWith('rename from ') || line.startsWith('rename to ')) {
                // Will be processed in processSection
            }

            // Check if we're entering patch file content changes
            if (currentFile.newPath.startsWith('patches/') &&
                currentFile.newPath.endsWith('.patch') &&
                line.startsWith('---')) {
                inPatchContent = true;
                currentPatchFile = currentFile.newPath;
                patchContentLines = [
                    `--- a/${currentFile.oldPath}`,
                    `+++ b/${currentFile.newPath}`,
                ];
            }

            // Collect patch content lines
            if (inPatchContent) {
                // Skip the original --- and +++ lines as we already added them
                if (line.startsWith('--- ') || line.startsWith('+++ ')) {
                    continue;
                }

                // Collect all diff lines
                if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ') || line.startsWith('@@')) {
                    patchContentLines.push(line);
                }
            }
        }
    }

    // Process last section
    if (currentFile && currentSection.length > 0) {
        processSection(currentFile, currentSection, result);
    }

    // Save last patch content if exists
    if (inPatchContent && currentPatchFile) {
        result.patchFiles.contentChanges.push({
            file: currentPatchFile,
            content: patchContentLines.join('\n'),
        });
    }

    log(`✓ Found ${result.packageJson.dependencies.length} package.json changes`, 'green');
    log(`✓ Found ${result.patchFiles.renames.length} patch file renames`, 'green');
    log(`✓ Found ${result.patchFiles.contentChanges.length} patch content changes`, 'green');
    log(`✓ Found ${Object.keys(result.otherFiles).length} other file changes`, 'green');

    return result;
}

/**
 * Process a section of the diff for a specific file
 * @param {Object} fileInfo - Information about the current file
 * @param {Array} lines - Lines in this section
 * @param {Object} result - Result object to populate
 */
function processSection(fileInfo, lines, result) {
    const {oldPath, newPath, isRename} = fileInfo;

    // Handle package.json changes
    if (newPath === 'package.json') {
        parsePackageJsonChanges(lines, result);
    }

    // Handle patch file renames
    else if (oldPath.startsWith('patches/') && newPath.startsWith('patches/')) {
        if (isRename) {
            result.patchFiles.renames.push({
                old: oldPath,
                new: newPath,
            });
        }
    }

    // Handle other files (app.json, TypeScript, Gradle, etc.)
    else if (!oldPath.startsWith('patches/')) {
        result.otherFiles[newPath] = {
            oldPath,
            changes: extractChanges(lines),
        };
    }
}

/**
 * Parse package.json dependency changes from diff lines
 * @param {Array} lines - Diff lines for package.json
 * @param {Object} result - Result object to populate
 */
function parsePackageJsonChanges(lines, result) {
    const removedPackages = new Map(); // packageName -> oldVersion
    const addedPackages = new Map(); // packageName -> newVersion

    // First pass: collect all removed and added packages
    for (const line of lines) {
        // Look for removed dependency lines (old version)
        if (line.startsWith('-    "') && line.includes('": "')) {
            const removedMatch = line.match(/-    "(.+?)": "(.+?)"/);
            if (removedMatch) {
                const packageName = removedMatch[1];
                const oldVersion = removedMatch[2].replace(/[",]/g, '');
                removedPackages.set(packageName, oldVersion);
            }
        }

        // Look for added dependencies (new version)
        else if (line.startsWith('+    "') && line.includes('": "')) {
            const addedMatch = line.match(/\+    "(.+?)": "(.+?)"/);
            if (addedMatch) {
                const packageName = addedMatch[1];
                const newVersion = addedMatch[2].replace(/[",]/g, '');
                addedPackages.set(packageName, newVersion);
            }
        }
    }

    // Second pass: determine if packages are updates or new additions
    for (const [packageName, newVersion] of addedPackages) {
        if (removedPackages.has(packageName)) {
            // This is an update
            const oldVersion = removedPackages.get(packageName);
            result.packageJson.dependencies.push({
                name: packageName,
                oldVersion,
                newVersion,
            });
            removedPackages.delete(packageName); // Mark as processed
        } else {
            // This is a new package
            result.packageJson.dependencies.push({
                name: packageName,
                oldVersion: null,
                newVersion,
            });
        }
    }
}

/**
 * Extract added and removed lines from a diff section
 * @param {Array} lines - Diff lines
 * @returns {Object} Added and removed lines
 */
function extractChanges(lines) {
    const changes = {
        added: [],
        removed: [],
    };

    for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            changes.added.push(line.substring(1));
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            changes.removed.push(line.substring(1));
        }
    }

    return changes;
}

/**
 * Update package.json with dependency changes
 * @param {Object} packageChanges - Parsed package.json changes
 * @param {boolean} dryRun - If true, only show what would be changed
 * @returns {boolean} Success status
 */
function updatePackageJson(packageChanges, dryRun = false) {
    log('\n📦 Updating package.json...', 'blue');

    const packageJsonPath = path.resolve(process.cwd(), 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        log('❌ Error: package.json not found', 'red');
        return false;
    }

    let content = fs.readFileSync(packageJsonPath, 'utf8');
    const originalContent = content;
    let changesMade = 0;

    for (const dep of packageChanges.dependencies) {
        if (dep.oldVersion) {
            // Update existing dependency
            const oldPattern = `"${dep.name}": "${dep.oldVersion}"`;
            const newPattern = `"${dep.name}": "${dep.newVersion}"`;

            if (content.includes(oldPattern)) {
                if (dryRun) {
                    log(`  [DRY RUN] Would update: ${dep.name}: ${dep.oldVersion} → ${dep.newVersion}`, 'yellow');
                } else {
                    content = content.replace(oldPattern, newPattern);
                    log(`  ✓ Updated: ${dep.name}: ${dep.oldVersion} → ${dep.newVersion}`, 'green');
                }
                changesMade++;
            } else {
                // Check if the new version is already there
                if (content.includes(newPattern)) {
                    log(`  ⊘ Already updated: ${dep.name} is already at ${dep.newVersion}`, 'cyan');
                } else {
                    log(`  ⚠ Warning: Could not find ${dep.name} with version ${dep.oldVersion}`, 'yellow');
                }
            }
        } else {
            // Add new dependency
            // We need to find the right place to insert it (alphabetically in dependencies section)
            const newLine = `    "${dep.name}": "${dep.newVersion}",`;

            if (content.includes(`"${dep.name}":`)) {
                log(`  ⊘ Already exists: ${dep.name}`, 'cyan');
            } else if (dryRun) {
                log(`  [DRY RUN] Would add: ${dep.name}: ${dep.newVersion}`, 'yellow');
                changesMade++;
            } else {
                // Find the dependencies section and add alphabetically
                const lines = content.split('\n');
                let inserted = false;
                let inDependencies = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    // Detect when we enter the dependencies section
                    if (line.includes('"dependencies"') || line.includes('"devDependencies"')) {
                        inDependencies = true;
                        continue;
                    }

                    // Exit dependencies section when we hit a closing brace at the same level
                    if (inDependencies && line.match(/^\s*\}/)) {
                        inDependencies = false;
                        continue;
                    }

                    // Only process lines within dependencies section
                    if (inDependencies) {
                        // Look for dependency lines in the format: "package-name": "version",
                        const match = line.match(/^\s+"([^"]+)":\s+"[^"]+",?$/);
                        if (match) {
                            const existingPackage = match[1];

                            // Insert alphabetically
                            if (dep.name < existingPackage) {
                                lines.splice(i, 0, newLine);
                                inserted = true;
                                break;
                            }
                        }
                    }
                }

                if (inserted) {
                    content = lines.join('\n');
                    log(`  ✓ Added: ${dep.name}: ${dep.newVersion}`, 'green');
                    changesMade++;
                } else {
                    log(`  ⚠ Warning: Could not find insertion point for ${dep.name}`, 'yellow');
                }
            }
        }
    }

    if (!dryRun && changesMade > 0) {
        fs.writeFileSync(packageJsonPath, content, 'utf8');
        log(`\n✅ Updated package.json (${changesMade} changes)`, 'green');
    } else if (dryRun && changesMade > 0) {
        log(`\n[DRY RUN] Would make ${changesMade} changes to package.json`, 'yellow');
    } else {
        log('\n⊘ No changes needed for package.json', 'cyan');
    }

    return true;
}

/**
 * Update app.json with changes from the diff
 * @param {Object} fileChanges - Parsed file changes
 * @param {boolean} dryRun - If true, only show what would be changed
 * @returns {boolean} Success status
 */
function updateAppJson(fileChanges, dryRun = false) {
    log('\n📱 Updating app.json...', 'blue');

    const appJsonPath = path.resolve(process.cwd(), 'app.json');

    if (!fs.existsSync(appJsonPath)) {
        log('❌ Error: app.json not found', 'red');
        return false;
    }

    let content = fs.readFileSync(appJsonPath, 'utf8');
    let changesMade = 0;

    // Check if plugins array needs to be added
    if (content.includes('"plugins"')) {
        log('  ⊘ Already has plugins array', 'cyan');
    } else if (dryRun) {
        log('  [DRY RUN] Would add plugins array with expo-web-browser', 'yellow');
        changesMade++;
    } else {
        // Add plugins array after displayName
        content = content.replace(
            /"displayName":\s*"([^"]+)"/,
            '"displayName": "$1",\n  "plugins": [\n    "expo-web-browser"\n  ]',
        );
        log('  ✓ Added plugins array with expo-web-browser', 'green');
        changesMade++;
    }

    if (!dryRun && changesMade > 0) {
        fs.writeFileSync(appJsonPath, content, 'utf8');
        log(`\n✅ Updated app.json (${changesMade} changes)`, 'green');
    } else if (dryRun && changesMade > 0) {
        log(`\n[DRY RUN] Would make ${changesMade} changes to app.json`, 'yellow');
    } else {
        log('\n⊘ No changes needed for app.json', 'cyan');
    }

    return true;
}

/**
 * Update TypeScript files with changes from the diff
 * @param {Object} fileChanges - Parsed file changes for the TypeScript file
 * @param {string} filePath - Path to the TypeScript file
 * @param {boolean} dryRun - If true, only show what would be changed
 * @returns {boolean} Success status
 */
function updateTypeScriptFile(fileChanges, filePath, dryRun = false) {
    log(`\n📝 Updating ${filePath}...`, 'blue');

    const fullPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
        log(`❌ Error: ${filePath} not found`, 'red');
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let changesMade = 0;

    // Apply the changes from the diff
    const {added, removed} = fileChanges.changes;

    // For expo_image/index.tsx, we need to:
    // 1. Add SharedRefType import
    // 2. Update type definitions

    if (filePath.includes('expo_image/index.tsx')) {
        // Check if SharedRefType import exists
        if (content.includes('SharedRefType')) {
            log('  ⊘ SharedRefType import already exists', 'cyan');
        } else if (dryRun) {
            log('  [DRY RUN] Would add SharedRefType import', 'yellow');
            changesMade++;
        } else {
            // Add import after the existing imports
            content = content.replace(
                /(import {urlSafeBase64Encode} from '@utils\/security';)/,
                '$1\n\nimport type {SharedRefType} from \'expo\';',
            );
            log('  ✓ Added SharedRefType import', 'green');
            changesMade++;
        }

        // Update type definitions
        const typeUpdates = [
            {
                old: 'const source: ImageSource = useMemo',
                new: 'const source: ImageSource | string | number | ImageSource[] | string[] | SharedRefType<\'image\'> | null | undefined = useMemo',
                description: 'source type definition',
            },
            {
                old: 'if (typeof props.source === \'number\') {',
                new: 'if (typeof props.source === \'number\' || typeof props.source === \'string\' || Array.isArray(props.source) || !props.source) {',
                description: 'source type check',
            },
            {
                old: 'if (id) {',
                new: 'if (id && typeof props.source === \'object\' && \'uri\' in props.source) {',
                description: 'source object check',
            },
            {
                old: 'const placeholder: ImageSource | undefined = useMemo',
                new: 'const placeholder: ImageSource | string | number | ImageSource[] | string[] | SharedRefType<\'image\'> | null | undefined = useMemo',
                description: 'placeholder type definition',
            },
            {
                old: 'if (!props.placeholder || typeof props.placeholder === \'number\' || typeof props.placeholder === \'string\') {',
                new: 'if (!props.placeholder || typeof props.placeholder === \'number\' || typeof props.placeholder === \'string\' || Array.isArray(props.placeholder)) {',
                description: 'placeholder type check',
            },
            {
                old: 'if (props.placeholder.uri && id) {',
                new: 'if (typeof props.placeholder === \'object\' && \'uri\' in props.placeholder && props.placeholder.uri && id) {',
                description: 'placeholder object check',
            },
        ];

        for (const update of typeUpdates) {
            if (content.includes(update.new)) {
                log(`  ⊘ Already updated: ${update.description}`, 'cyan');
            } else if (content.includes(update.old)) {
                if (dryRun) {
                    log(`  [DRY RUN] Would update: ${update.description}`, 'yellow');
                    changesMade++;
                } else {
                    content = content.replace(update.old, update.new);
                    log(`  ✓ Updated: ${update.description}`, 'green');
                    changesMade++;
                }
            }
        }
    }

    if (!dryRun && changesMade > 0) {
        fs.writeFileSync(fullPath, content, 'utf8');
        log(`\n✅ Updated ${filePath} (${changesMade} changes)`, 'green');
    } else if (dryRun && changesMade > 0) {
        log(`\n[DRY RUN] Would make ${changesMade} changes to ${filePath}`, 'yellow');
    } else {
        log(`\n⊘ No changes needed for ${filePath}`, 'cyan');
    }

    return true;
}

/**
 * Update Gradle lockfile with new dependencies
 * @param {Object} fileChanges - Parsed file changes
 * @param {boolean} dryRun - If true, only show what would be changed
 * @returns {boolean} Success status
 */
function updateGradleLockfile(fileChanges, dryRun = false) {
    log('\n🔧 Updating android/buildscript-gradle.lockfile...', 'blue');

    const lockfilePath = path.resolve(process.cwd(), 'android/buildscript-gradle.lockfile');

    if (!fs.existsSync(lockfilePath)) {
        log('❌ Error: android/buildscript-gradle.lockfile not found', 'red');
        return false;
    }

    let content = fs.readFileSync(lockfilePath, 'utf8');
    const lines = content.split('\n');
    let changesMade = 0;

    // Dependencies to add (from the diff)
    const dependenciesToAdd = [
        'org.jetbrains.kotlin:kotlin-stdlib-common:2.0.21=classpath',
        'org.jetbrains.kotlinx:kotlinx-serialization-bom:1.6.3=classpath',
        'org.jetbrains.kotlinx:kotlinx-serialization-core-jvm:1.6.3=classpath',
        'org.jetbrains.kotlinx:kotlinx-serialization-core:1.6.3=classpath',
        'org.jetbrains.kotlinx:kotlinx-serialization-json-jvm:1.6.3=classpath',
        'org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3=classpath',
    ];

    for (const dep of dependenciesToAdd) {
        if (content.includes(dep)) {
            log(`  ⊘ Already exists: ${dep.split(':')[1]}`, 'cyan');
        } else if (dryRun) {
            log(`  [DRY RUN] Would add: ${dep}`, 'yellow');
            changesMade++;
        } else {
            // Find the correct alphabetical position to insert
            const depName = dep.split('=')[0];
            let inserted = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('=classpath')) {
                    const existingDepName = line.split('=')[0];
                    if (depName < existingDepName) {
                        lines.splice(i, 0, dep);
                        inserted = true;
                        log(`  ✓ Added: ${dep.split(':')[1]}`, 'green');
                        changesMade++;
                        break;
                    }
                }
            }

            if (!inserted) {
                log(`  ⚠ Warning: Could not find insertion point for ${dep}`, 'yellow');
            }
        }
    }

    if (!dryRun && changesMade > 0) {
        content = lines.join('\n');
        fs.writeFileSync(lockfilePath, content, 'utf8');
        log(`\n✅ Updated android/buildscript-gradle.lockfile (${changesMade} changes)`, 'green');
    } else if (dryRun && changesMade > 0) {
        log(`\n[DRY RUN] Would make ${changesMade} changes to android/buildscript-gradle.lockfile`, 'yellow');
    } else {
        log('\n⊘ No changes needed for android/buildscript-gradle.lockfile', 'cyan');
    }

    return true;
}

/**
 * Rename and update patch files
 * @param {Object} patchFileChanges - Parsed patch file changes
 * @param {boolean} dryRun - If true, only show what would be changed
 * @returns {boolean} Success status
 */
function updatePatchFiles(patchFileChanges, dryRun = false) {
    log('\n🔧 Managing patch files...', 'blue');

    const patchesDir = path.resolve(process.cwd(), 'patches');

    if (!fs.existsSync(patchesDir)) {
        log('❌ Error: patches directory not found', 'red');
        return false;
    }

    let changesMade = 0;

    // Handle patch file renames
    for (const rename of patchFileChanges.renames) {
        const oldPath = path.resolve(process.cwd(), rename.old);
        const newPath = path.resolve(process.cwd(), rename.new);
        const oldFileName = path.basename(rename.old);
        const newFileName = path.basename(rename.new);

        if (fs.existsSync(newPath)) {
            log(`  ⊘ Already renamed: ${newFileName} exists`, 'cyan');
        } else if (!fs.existsSync(oldPath)) {
            log(`  ⚠ Warning: Source file not found: ${oldFileName}`, 'yellow');
        } else if (dryRun) {
            log(`  [DRY RUN] Would rename: ${oldFileName} → ${newFileName}`, 'yellow');
            changesMade++;
        } else {
            fs.renameSync(oldPath, newPath);
            log(`  ✓ Renamed: ${oldFileName} → ${newFileName}`, 'green');
            changesMade++;
        }
    }

    // Handle patch file content changes
    // Note: Content changes should be applied after renames
    for (const contentChange of patchFileChanges.contentChanges) {
        const patchPath = path.resolve(process.cwd(), contentChange.file);
        const patchFileName = path.basename(contentChange.file);

        // In dry-run mode, the file might not exist yet (not renamed)
        if (!fs.existsSync(patchPath)) {
            if (dryRun) {
                log(`  [DRY RUN] Would update content: ${patchFileName} (after rename)`, 'yellow');
                changesMade++;
                continue;
            } else {
                log(`  ⚠ Warning: Patch file not found: ${patchFileName}`, 'yellow');
                continue;
            }
        }

        if (dryRun) {
            log(`  [DRY RUN] Would update content: ${patchFileName}`, 'yellow');
            changesMade++;
        } else {
            // For expo-image patch, use the stored correct content
            if (patchFileName === 'expo-image+2.4.1.patch') {
                fs.writeFileSync(patchPath, EXPO_IMAGE_PATCH_CONTENT, 'utf8');
                log(`  ✓ Updated content: ${patchFileName}`, 'green');
                changesMade++;
            } else {
                log(`  ⚠ Warning: No content update logic for ${patchFileName}`, 'yellow');
            }
        }
    }

    if (!dryRun && changesMade > 0) {
        log(`\n✅ Updated patch files (${changesMade} changes)`, 'green');
    } else if (dryRun && changesMade > 0) {
        log(`\n[DRY RUN] Would make ${changesMade} changes to patch files`, 'yellow');
    } else {
        log('\n⊘ No changes needed for patch files', 'cyan');
    }

    return true;
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);

    // Parse command line arguments
    let diffFile = '9325.diff';
    let dryRun = false;
    let applyChanges = false;

    for (const arg of args) {
        if (arg === '--dry-run') {
            dryRun = true;
            applyChanges = true;
        } else if (arg === '--apply') {
            applyChanges = true;
        } else if (!arg.startsWith('--')) {
            diffFile = arg;
        }
    }

    log('\n🚀 16KB Page Size Patch Application Tool', 'bright');
    log('=========================================\n', 'bright');

    // Check if diff file exists
    const diffPath = path.resolve(process.cwd(), diffFile);
    if (!fs.existsSync(diffPath)) {
        log(`❌ Error: Diff file not found: ${diffPath}`, 'red');
        process.exit(1);
    }

    log(`📄 Using diff file: ${diffFile}`, 'cyan');
    if (dryRun) {
        log('🔍 Mode: DRY RUN (no changes will be made)', 'yellow');
    } else if (applyChanges) {
        log('✏️  Mode: APPLY CHANGES', 'green');
    } else {
        log('📖 Mode: PARSE ONLY (use --dry-run or --apply to make changes)', 'cyan');
    }

    // Parse the diff
    const parsedDiff = parseDiff(diffPath);

    // Display what was found
    log('\n📊 Parsed Changes Summary:', 'yellow');
    log('========================\n', 'yellow');

    if (parsedDiff.packageJson.dependencies.length > 0) {
        log('📦 Package.json Dependencies:', 'cyan');
        parsedDiff.packageJson.dependencies.forEach((dep) => {
            if (dep.oldVersion) {
                log(`  • ${dep.name}: ${dep.oldVersion} → ${dep.newVersion}`, 'reset');
            } else {
                log(`  • ${dep.name}: (new) → ${dep.newVersion}`, 'green');
            }
        });
        log('');
    }

    if (parsedDiff.patchFiles.renames.length > 0) {
        log('📝 Patch File Renames:', 'cyan');
        parsedDiff.patchFiles.renames.forEach((rename) => {
            log(`  • ${path.basename(rename.old)} → ${path.basename(rename.new)}`, 'reset');
        });
        log('');
    }

    if (parsedDiff.patchFiles.contentChanges.length > 0) {
        log('✏️  Patch Content Changes:', 'cyan');
        parsedDiff.patchFiles.contentChanges.forEach((change) => {
            log(`  • ${change.file}`, 'reset');
        });
        log('');
    }

    if (Object.keys(parsedDiff.otherFiles).length > 0) {
        log('📁 Other File Changes:', 'cyan');
        Object.keys(parsedDiff.otherFiles).forEach((file) => {
            const changes = parsedDiff.otherFiles[file].changes;
            log(`  • ${file} (+${changes.added.length} -${changes.removed.length})`, 'reset');
        });
        log('');
    }

    log('✅ Diff parsing complete!\n', 'green');

    // Apply changes if requested
    if (applyChanges) {
        log('\n' + '='.repeat(50), 'bright');
        log('APPLYING CHANGES', 'bright');
        log('='.repeat(50) + '\n', 'bright');

        // Update package.json
        if (parsedDiff.packageJson.dependencies.length > 0) {
            updatePackageJson(parsedDiff.packageJson, dryRun);
        }

        // Update app.json
        if (parsedDiff.otherFiles['app.json']) {
            updateAppJson(parsedDiff.otherFiles['app.json'], dryRun);
        }

        // Update TypeScript files
        if (parsedDiff.otherFiles['app/components/expo_image/index.tsx']) {
            updateTypeScriptFile(
                parsedDiff.otherFiles['app/components/expo_image/index.tsx'],
                'app/components/expo_image/index.tsx',
                dryRun,
            );
        }

        // Update Gradle lockfile
        if (parsedDiff.otherFiles['android/buildscript-gradle.lockfile']) {
            updateGradleLockfile(parsedDiff.otherFiles['android/buildscript-gradle.lockfile'], dryRun);
        }

        // Update patch files
        if (parsedDiff.patchFiles.renames.length > 0 || parsedDiff.patchFiles.contentChanges.length > 0) {
            updatePatchFiles(parsedDiff.patchFiles, dryRun);
        }

        // TODO: Add npm install execution

        if (dryRun) {
            log('\n✅ Dry run complete! No files were modified.\n', 'green');
        } else {
            log('\n✅ Changes applied successfully!\n', 'green');
        }
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {parseDiff};

