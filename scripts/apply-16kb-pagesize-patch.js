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

const GRADLE_DEPENDENCIES = [
    'org.jetbrains.kotlin:kotlin-stdlib-common:2.0.21=classpath',
    'org.jetbrains.kotlinx:kotlinx-serialization-bom:1.6.3=classpath',
    'org.jetbrains.kotlinx:kotlinx-serialization-core-jvm:1.6.3=classpath',
    'org.jetbrains.kotlinx:kotlinx-serialization-core:1.6.3=classpath',
    'org.jetbrains.kotlinx:kotlinx-serialization-json-jvm:1.6.3=classpath',
    'org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3=classpath',
];

const TYPESCRIPT_UPDATES = [
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

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, color = 'reset') {
    // eslint-disable-next-line no-console
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

class ChangeTracker {
    constructor(dryRun) {
        this.dryRun = dryRun;
        this.changes = 0;
    }

    logChange(message, type = 'green') {
        if (this.dryRun) {
            log(`  [DRY RUN] Would ${message}`, 'yellow');
        } else {
            log(`  ✓ ${message}`, type);
        }
        this.changes++;
    }

    logSkip(message) {
        log(`  ⊘ ${message}`, 'cyan');
    }

    logWarning(message) {
        log(`  ⚠ ${message}`, 'yellow');
    }

    summary(fileName) {
        if (this.changes > 0) {
            if (this.dryRun) {
                log(`\n[DRY RUN] Would make ${this.changes} changes to ${fileName}`, 'yellow');
            } else {
                log(`\n✅ Updated ${fileName} (${this.changes} changes)`, 'green');
            }
        } else {
            log(`\n⊘ No changes needed for ${fileName}`, 'cyan');
        }
    }
}

function updateFile(filePath, displayName, applyFn, dryRun) {
    log(`\n${displayName}...`, 'blue');

    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
        log(`❌ Error: ${filePath} not found`, 'red');
        return false;
    }

    const tracker = new ChangeTracker(dryRun);
    const content = fs.readFileSync(fullPath, 'utf8');
    const newContent = applyFn(content, tracker);

    if (!dryRun && tracker.changes > 0) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
    }

    tracker.summary(filePath);
    return true;
}

// ============================================================================
// DIFF PARSING
// ============================================================================

function parseDiff(diffPath) {
    log('\n📖 Parsing diff file...', 'blue');

    const diffContent = fs.readFileSync(diffPath, 'utf8');
    const lines = diffContent.split('\n');

    const result = {
        packageJson: {dependencies: []},
        patchFiles: {renames: [], contentChanges: []},
        otherFiles: {},
    };

    let currentFile = null;
    let currentSection = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('diff --git ')) {
            if (currentFile && currentSection.length > 0) {
                processSection(currentFile, currentSection, result);
            }

            const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
            if (match) {
                currentFile = {
                    oldPath: match[1],
                    newPath: match[2],
                    isRename: match[1] !== match[2],
                };
                currentSection = [line];
            }
        } else if (currentFile) {
            currentSection.push(line);
        }
    }

    if (currentFile && currentSection.length > 0) {
        processSection(currentFile, currentSection, result);
    }

    log(`✓ Found ${result.packageJson.dependencies.length} package.json changes`, 'green');
    log(`✓ Found ${result.patchFiles.renames.length} patch file renames`, 'green');
    log(`✓ Found ${Object.keys(result.otherFiles).length} other file changes`, 'green');

    return result;
}

function processSection(fileInfo, lines, result) {
    const {oldPath, newPath, isRename} = fileInfo;

    if (newPath === 'package.json') {
        parsePackageJsonChanges(lines, result);
    } else if (oldPath.startsWith('patches/') && newPath.startsWith('patches/')) {
        if (isRename) {
            result.patchFiles.renames.push({old: oldPath, new: newPath});
        }
    } else if (!oldPath.startsWith('patches/')) {
        result.otherFiles[newPath] = {
            oldPath,
            changes: extractChanges(lines),
        };
    }
}

function parsePackageJsonChanges(lines, result) {
    const removedPackages = new Map();
    const addedPackages = new Map();

    for (const line of lines) {
        if (line.startsWith('-    "') && line.includes('": "')) {
            const match = line.match(/-    "(.+?)": "(.+?)"/);
            if (match) {
                removedPackages.set(match[1], match[2].replace(/[",]/g, ''));
            }
        } else if (line.startsWith('+    "') && line.includes('": "')) {
            const match = line.match(/\+    "(.+?)": "(.+?)"/);
            if (match) {
                addedPackages.set(match[1], match[2].replace(/[",]/g, ''));
            }
        }
    }

    for (const [packageName, newVersion] of addedPackages) {
        if (removedPackages.has(packageName)) {
            result.packageJson.dependencies.push({
                name: packageName,
                oldVersion: removedPackages.get(packageName),
                newVersion,
            });
            removedPackages.delete(packageName);
        } else {
            result.packageJson.dependencies.push({
                name: packageName,
                oldVersion: null,
                newVersion,
            });
        }
    }
}

function extractChanges(lines) {
    const changes = {added: [], removed: []};
    for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            changes.added.push(line.substring(1));
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            changes.removed.push(line.substring(1));
        }
    }
    return changes;
}

// ============================================================================
// UPDATE FUNCTIONS
// ============================================================================

function updatePackageJson(packageChanges, dryRun) {
    return updateFile('package.json', '📦 Updating package.json', (content, tracker) => {
        let updatedContent = content;
        for (const dep of packageChanges.dependencies) {
            if (dep.oldVersion) {
                updatedContent = updateDependency(updatedContent, dep, tracker);
            } else {
                updatedContent = addDependency(updatedContent, dep, tracker);
            }
        }
        return updatedContent;
    }, dryRun);
}

function updateDependency(content, dep, tracker) {
    const oldPattern = `"${dep.name}": "${dep.oldVersion}"`;
    const newPattern = `"${dep.name}": "${dep.newVersion}"`;

    if (content.includes(oldPattern)) {
        tracker.logChange(`Updated: ${dep.name}: ${dep.oldVersion} → ${dep.newVersion}`);
        return content.replace(oldPattern, newPattern);
    }

    if (content.includes(newPattern)) {
        tracker.logSkip(`Already updated: ${dep.name} is already at ${dep.newVersion}`);
    } else {
        tracker.logWarning(`Could not find ${dep.name} with version ${dep.oldVersion}`);
    }
    return content;
}

function addDependency(content, dep, tracker) {
    if (content.includes(`"${dep.name}":`)) {
        tracker.logSkip(`Already exists: ${dep.name}`);
        return content;
    }

    const newLine = `    "${dep.name}": "${dep.newVersion}",`;
    const lines = content.split('\n');
    let inDependencies = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('"dependencies"') || line.includes('"devDependencies"')) {
            inDependencies = true;
            continue;
        }

        if (inDependencies && line.match(/^\s*\}/)) {
            inDependencies = false;
            continue;
        }

        if (inDependencies) {
            const match = line.match(/^\s+"([^"]+)":\s+"[^"]+",?$/);
            if (match && dep.name < match[1]) {
                lines.splice(i, 0, newLine);
                tracker.logChange(`Added: ${dep.name}: ${dep.newVersion}`);
                return lines.join('\n');
            }
        }
    }

    tracker.logWarning(`Could not find insertion point for ${dep.name}`);
    return content;
}

function updateAppJson(fileChanges, dryRun) {
    return updateFile('app.json', '📱 Updating app.json', (content, tracker) => {
        if (content.includes('"plugins"')) {
            tracker.logSkip('Already has plugins array');
            return content;
        }

        const updatedContent = content.replace(
            /"displayName":\s*"([^"]+)"/,
            '"displayName": "$1",\n  "plugins": [\n    "expo-web-browser"\n  ]',
        );
        tracker.logChange('Added plugins array with expo-web-browser');
        return updatedContent;
    }, dryRun);
}

function updateExpoImageIndexTsx(fileChanges, filePath, dryRun) {
    return updateFile(filePath, `📝 Updating ${filePath}`, (content, tracker) => {
        let updatedContent = content;

        if (updatedContent.includes('SharedRefType')) {
            tracker.logSkip('SharedRefType import already exists');
        } else {
            updatedContent = updatedContent.replace(
                /(import {urlSafeBase64Encode} from '@utils\/security';)/,
                '$1\n\nimport type {SharedRefType} from \'expo\';',
            );
            tracker.logChange('Added SharedRefType import');
        }

        for (const update of TYPESCRIPT_UPDATES) {
            if (updatedContent.includes(update.new)) {
                tracker.logSkip(`Already updated: ${update.description}`);
            } else if (updatedContent.includes(update.old)) {
                updatedContent = updatedContent.replace(update.old, update.new);
                tracker.logChange(`Updated: ${update.description}`);
            }
        }

        return updatedContent;
    }, dryRun);
}

function updateGradleLockfile(fileChanges, dryRun) {
    return updateFile('android/buildscript-gradle.lockfile', '🔧 Updating android/buildscript-gradle.lockfile', (content, tracker) => {
        const lines = content.split('\n');

        for (const dep of GRADLE_DEPENDENCIES) {
            if (content.includes(dep)) {
                tracker.logSkip(`Already exists: ${dep.split(':')[1]}`);
            } else {
                const depName = dep.split('=')[0];
                let inserted = false;

                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('=classpath')) {
                        const existingDepName = lines[i].split('=')[0];
                        if (depName < existingDepName) {
                            lines.splice(i, 0, dep);
                            tracker.logChange(`Added: ${dep.split(':')[1]}`);
                            inserted = true;
                            break;
                        }
                    }
                }

                if (!inserted) {
                    tracker.logWarning(`Could not find insertion point for ${dep}`);
                }
            }
        }

        return lines.join('\n');
    }, dryRun);
}

function updatePatchFiles(patchFileChanges, dryRun) {
    log('\n🔧 Managing patch files...', 'blue');

    const patchesDir = path.resolve(process.cwd(), 'patches');
    if (!fs.existsSync(patchesDir)) {
        log('❌ Error: patches directory not found', 'red');
        return false;
    }

    const tracker = new ChangeTracker(dryRun);

    // Handle renames
    for (const rename of patchFileChanges.renames) {
        const oldPath = path.resolve(process.cwd(), rename.old);
        const newPath = path.resolve(process.cwd(), rename.new);
        const newFileName = path.basename(rename.new);

        if (fs.existsSync(newPath)) {
            tracker.logSkip(`Already renamed: ${newFileName} exists`);
        } else if (fs.existsSync(oldPath)) {
            if (!dryRun) {
                fs.renameSync(oldPath, newPath);
            }
            tracker.logChange(`Renamed: ${path.basename(rename.old)} → ${newFileName}`);
        } else {
            tracker.logWarning(`Source file not found: ${path.basename(rename.old)}`);
        }
    }

    // Handle content updates
    for (const contentChange of patchFileChanges.contentChanges) {
        const patchPath = path.resolve(process.cwd(), contentChange.file);
        const patchFileName = path.basename(contentChange.file);

        if (!fs.existsSync(patchPath)) {
            if (!dryRun) {
                tracker.logWarning(`Patch file not found: ${patchFileName}`);
            }
            continue;
        }

        if (patchFileName === 'expo-image+2.4.1.patch') {
            const sourceFile = path.join(__dirname, patchFileName);
            if (fs.existsSync(sourceFile)) {
                if (!dryRun) {
                    fs.copyFileSync(sourceFile, patchPath);
                }
                tracker.logChange(`Updated content: ${patchFileName}`);
            }
        } else {
            tracker.logWarning(`No content update logic for ${patchFileName}`);
        }
    }

    tracker.summary('patch files');
    return true;
}

// ============================================================================
// MAIN
// ============================================================================

function parseArgs() {
    const args = process.argv.slice(2);
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

    return {diffFile, dryRun, applyChanges};
}

function displaySummary(parsedDiff) {
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

    if (Object.keys(parsedDiff.otherFiles).length > 0) {
        log('📁 Other File Changes:', 'cyan');
        Object.keys(parsedDiff.otherFiles).forEach((file) => {
            const changes = parsedDiff.otherFiles[file].changes;
            log(`  • ${file} (+${changes.added.length} -${changes.removed.length})`, 'reset');
        });
        log('');
    }

    log('✅ Diff parsing complete!\n', 'green');
}

function installUpdatedPackages(dependencies, dryRun) {
    if (dependencies.length === 0) {
        return;
    }

    log('\n📦 Installing updated packages...', 'blue');

    const packages = dependencies.map((dep) => `${dep.name}@${dep.newVersion}`);

    if (dryRun) {
        log(`  [DRY RUN] Would install: ${packages.join(' ')}`, 'yellow');
        return;
    }

    try {
        log(`  Installing: ${packages.join(', ')}`, 'cyan');
        execSync(`npm install --ignore-scripts ${packages.join(' ')}`, {
            stdio: 'inherit',
            cwd: process.cwd(),
        });
        log('  ✓ Packages installed successfully', 'green');
    } catch (error) {
        log(`  ⚠ Warning: npm install failed: ${error.message}`, 'yellow');
    }
}

function applyAllChanges(parsedDiff, dryRun) {
    log('\n' + '='.repeat(50), 'bright');
    log('APPLYING CHANGES', 'bright');
    log('='.repeat(50) + '\n', 'bright');

    if (parsedDiff.packageJson.dependencies.length > 0) {
        updatePackageJson(parsedDiff.packageJson, dryRun);
    }

    if (parsedDiff.otherFiles['app.json']) {
        updateAppJson(parsedDiff.otherFiles['app.json'], dryRun);
    }

    if (parsedDiff.otherFiles['app/components/expo_image/index.tsx']) {
        updateExpoImageIndexTsx(
            parsedDiff.otherFiles['app/components/expo_image/index.tsx'],
            'app/components/expo_image/index.tsx',
            dryRun,
        );
    }

    if (parsedDiff.otherFiles['android/buildscript-gradle.lockfile']) {
        updateGradleLockfile(parsedDiff.otherFiles['android/buildscript-gradle.lockfile'], dryRun);
    }

    if (parsedDiff.patchFiles.renames.length > 0 || parsedDiff.patchFiles.contentChanges.length > 0) {
        updatePatchFiles(parsedDiff.patchFiles, dryRun);
    }

    // Install updated packages
    if (parsedDiff.packageJson.dependencies.length > 0) {
        installUpdatedPackages(parsedDiff.packageJson.dependencies, dryRun);
    }

    if (dryRun) {
        log('\n✅ Dry run complete! No files were modified.\n', 'green');
    } else {
        log('\n✅ Changes applied successfully!\n', 'green');
    }
}

function main() {
    const {diffFile, dryRun, applyChanges: shouldApply} = parseArgs();

    log('\n🚀 16KB Page Size Patch Application Tool', 'bright');
    log('=========================================\n', 'bright');

    const diffPath = path.resolve(process.cwd(), diffFile);
    if (!fs.existsSync(diffPath)) {
        log(`❌ Error: Diff file not found: ${diffPath}`, 'red');
        process.exit(1);
    }

    log(`📄 Using diff file: ${diffFile}`, 'cyan');
    if (dryRun) {
        log('🔍 Mode: DRY RUN (no changes will be made)', 'yellow');
    } else if (shouldApply) {
        log('✏️  Mode: APPLY CHANGES', 'green');
    } else {
        log('📖 Mode: PARSE ONLY (use --dry-run or --apply to make changes)', 'cyan');
    }

    const parsedDiff = parseDiff(diffPath);
    displaySummary(parsedDiff);

    if (shouldApply) {
        applyAllChanges(parsedDiff, dryRun);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {parseDiff};
