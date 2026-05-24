// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

// Restore VisibleMatcher default from 75% back to 50%.
// Detox 20.48.0 changed this default (PR #4915), causing elements that are
// 50-74% visible to no longer be matched. Our tests rely on the 50% threshold.
const nativePath = path.join(__dirname, '..', 'node_modules', 'detox', 'src', 'android', 'matchers', 'native.js');

if (fs.existsSync(nativePath)) {
    const original = fs.readFileSync(nativePath, 'utf8');
    const patched = original.replace(
        'constructor(pct = 75)',
        'constructor(pct = 50)',
    );

    if (original === patched) {
        console.log('postinstall: VisibleMatcher already at 50% or pattern not found, no change needed');
    } else {
        fs.writeFileSync(nativePath, patched, 'utf8');
        console.log('postinstall: VisibleMatcher default restored to 50%');
    }
} else {
    console.log('postinstall: detox native.js not found, skipping VisibleMatcher patch');
}

// Patch Detox's FabricUIManagerIdlingResources to handle RN 0.81+ field rename.
//
// Detox 20.51.1 hardcodes the field name `mMountItemDispatcher` at
// FabricUIManagerIdlingResources.kt:103:
//   val mountItemDispatcher = Reflect.on(fabricUIManager).field("mMountItemDispatcher").get<Any>()
//
// RN 0.81+ dropped the `m` prefix from several FabricUIManager internal fields.
// Detox already version-gates two of these (`mountItems`/`mMountItems` at line ~92,
// `viewCommandMountItems`/`mViewCommandMountItems` at line ~109) but missed
// `mountItemDispatcher`. On RN 0.83 (this repo) the reflection throws
// `NoSuchFieldException: mMountItemDispatcher`, which Detox surfaces as a crash via
// the periodic QueryStatusActionHandler sync poll — abruptly terminating any test
// in flight (channel_copy MM-T868_1 and all Teams - Invite specs crashed this way in
// CI run 26348154923; full stack in shard-19 detox.log).
//
// Fix: replace the hardcoded `"mMountItemDispatcher"` with the same version-gate
// pattern Detox already uses on the two adjacent fields.
const fabricIdlingPath = path.join(
    __dirname, '..', 'node_modules', 'detox',
    'android', 'detox', 'src', 'full', 'java', 'com', 'wix', 'detox',
    'reactnative', 'idlingresources', 'uimodule', 'fabric',
    'FabricUIManagerIdlingResources.kt',
);

if (fs.existsSync(fabricIdlingPath)) {
    const kt = fs.readFileSync(fabricIdlingPath, 'utf8');
    const target =
        '    private fun getMountItemDispatcher(): Any {\n' +
        '        val fabricUIManager = UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC)\n' +
        '        val mountItemDispatcher = Reflect.on(fabricUIManager).field("mMountItemDispatcher").get<Any>()\n' +
        '        return mountItemDispatcher\n' +
        '    }';
    const replacement =
        '    private fun getMountItemDispatcher(): Any {\n' +
        '        val fabricUIManager = UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC)\n' +
        '        // mattermost-mobile patch: RN 0.81+ dropped the `m` prefix from this field, matching\n' +
        '        // the version gate Detox already applies to `mountItems` (line ~92) and\n' +
        '        // `viewCommandMountItems` (line ~109). Without this, RN 0.83 crashes with\n' +
        '        // `NoSuchFieldException: mMountItemDispatcher` via the periodic sync poll.\n' +
        '        val fieldName = if (ReactNativeInfo.rnVersion().minor >= 81) {\n' +
        '            "mountItemDispatcher"\n' +
        '        } else {\n' +
        '            "mMountItemDispatcher"\n' +
        '        }\n' +
        '        val mountItemDispatcher = Reflect.on(fabricUIManager).field(fieldName).get<Any>()\n' +
        '        return mountItemDispatcher\n' +
        '    }';

    if (kt.includes(replacement)) {
        console.log('postinstall: FabricUIManagerIdlingResources mountItemDispatcher patch already applied');
    } else if (kt.includes(target)) {
        fs.writeFileSync(fabricIdlingPath, kt.replace(target, replacement), 'utf8');
        console.log('postinstall: FabricUIManagerIdlingResources mountItemDispatcher patched for RN 0.81+ field rename');
    } else {
        console.log('postinstall: FabricUIManagerIdlingResources mountItemDispatcher pattern not found (Detox version may have changed), skipping');
    }
} else {
    console.log('postinstall: FabricUIManagerIdlingResources.kt not found, skipping mountItemDispatcher patch');
}
