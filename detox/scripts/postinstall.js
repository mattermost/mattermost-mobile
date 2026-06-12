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

// Patch Detox's FabricUIManagerIdlingResources to null-guard the UIManager lookup.
//
// Bug: Detox 20.50.4 calls
//   UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC)
// and passes the result directly to `Reflect.on(...)`. The Kotlin signature of
// `getUIManager` returns `UIManager?` (nullable), and RN returns null during
// brief React-context teardown / screen-replace windows. joor's
//   `Reflect.on(null)` falls back to `Object.class` as the reflection target.
//   `Object.class.getField/getDeclaredField("mMountItemDispatcher")` then
//   throws `NoSuchFieldException`.
// This crashes whatever test happens to be running when Detox's periodic
// QueryStatusActionHandler sync poll fires (MM-T868_1, MM-T1697,
// Teams - Invite suite — observed varying victims across CI runs).
//
// The previous attempt (a field-name version-gate) was based on the wrong
// hypothesis that RN 0.83 had renamed the field. It hadn't — RN 0.83.9
// FabricUIManager.java:177 still declares
//   `private final MountItemDispatcher mMountItemDispatcher;`.
// The lookup target class was the issue (Object, due to null), not the name.
//
// Fix: null-guard the UIManager lookup; if it's null, treat the queue as
// empty (size 0) — semantically correct because a non-existent UIManager
// trivially has nothing to mount.
//
// NOTE: This patch modifies the .kt source in `node_modules/detox`. It only
// takes effect at runtime if gradle compiles Detox from source — see
// `android/settings.gradle` for the `include ':detox'` block. With the
// default prebuilt `com.wix:detox` AAR setup the patch is dead code.
const fabricIdlingPath = path.join(
    __dirname, '..', 'node_modules', 'detox',
    'android', 'detox', 'src', 'full', 'java', 'com', 'wix', 'detox',
    'reactnative', 'idlingresources', 'uimodule', 'fabric',
    'FabricUIManagerIdlingResources.kt',
);

function applyFabricIdlingPatch(kt) {
    // Idempotent marker so we can detect "already patched".
    const patchedMarker = '// mattermost-mobile patch: null-guard getUIManager';
    if (kt.includes(patchedMarker)) {
        return {kt, msg: 'already applied (null-guard)'};
    }

    // Step 1 — replace `getMountItemDispatcher`. Two starting states are
    // accepted: (a) Detox 20.50.4 original; (b) the previous (wrong)
    // field-rename version we shipped in an earlier postinstall.
    const newGetter =
        '    private fun getMountItemDispatcher(): Any? {\n' +
        '        ' + patchedMarker + '. UIManagerHelper.getUIManager returns\n' +
        '        // UIManager? — RN 0.83 returns null during brief context-teardown windows\n' +
        '        // and joor`s `Reflect.on(null)` falls back to Object.class, which then\n' +
        '        // throws `NoSuchFieldException: mMountItemDispatcher`. Treat null as idle.\n' +
        '        val fabricUIManager = UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC)\n' +
        '            ?: return null\n' +
        '        val mountItemDispatcher = Reflect.on(fabricUIManager).field("mMountItemDispatcher").get<Any>()\n' +
        '        return mountItemDispatcher\n' +
        '    }';

    const originalGetter =
        '    private fun getMountItemDispatcher(): Any {\n' +
        '        val fabricUIManager = UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC)\n' +
        '        val mountItemDispatcher = Reflect.on(fabricUIManager).field("mMountItemDispatcher").get<Any>()\n' +
        '        return mountItemDispatcher\n' +
        '    }';

    const wrongFieldRenameGetter =
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

    let out = kt;
    if (out.includes(originalGetter)) {
        out = out.replace(originalGetter, newGetter);
    } else if (out.includes(wrongFieldRenameGetter)) {
        out = out.replace(wrongFieldRenameGetter, newGetter);
    } else {
        return {kt, msg: 'getMountItemDispatcher pattern not found (Detox source layout changed?), skipping'};
    }

    // Step 2 — null-guard the two callers so a null dispatcher means "idle"
    // (size 0). The original callers assume the return type is `Any`. We've
    // widened it to `Any?` above, so the callers need an early-return when
    // null.
    const sizeCallerOriginal = 'val mountItemDispatcher = getMountItemDispatcher()\n';
    const sizeCallerPatched = 'val mountItemDispatcher = getMountItemDispatcher() ?: return 0\n';
    if (!out.includes(sizeCallerOriginal)) {
        return {kt, msg: 'getMountItemDispatcher caller pattern not found, skipping (no changes made)'};
    }
    out = out.split(sizeCallerOriginal).join(sizeCallerPatched);

    return {kt: out, msg: 'patched (null-guard)'};
}

if (fs.existsSync(fabricIdlingPath)) {
    const kt = fs.readFileSync(fabricIdlingPath, 'utf8');
    const {kt: patched, msg} = applyFabricIdlingPatch(kt);
    if (patched !== kt) {
        fs.writeFileSync(fabricIdlingPath, patched, 'utf8');
    }
    console.log(`postinstall: FabricUIManagerIdlingResources ${msg}`);
} else {
    console.log('postinstall: FabricUIManagerIdlingResources.kt not found, skipping null-guard patch');
}

// Patch Detox's JavaTimersReflected to null-guard the reactHost/reactInstance
// reflection chain — the same bug class as the FabricUIManagerIdlingResources
// patch above, in the timers idling resource.
//
// Bug: `ReactHostImpl.reactInstance` is declared nullable in RN 0.83
// (ReactHostImpl.kt:137 `private var reactInstance: ReactInstance? = null`)
// and IS null during React-context startup/teardown windows. joor's
// `Reflect.on(null)` falls back to `Object.class`, so the subsequent
// `.field("javaTimerManager")` throws
//   `org.joor.ReflectException: java.lang.NoSuchFieldException: javaTimerManager`
// inside FabricTimersIdlingResource.checkIdle, which Detox surfaces as
// "The app has crashed" via the periodic QueryStatusActionHandler sync poll.
// Observed killing 6 tests in account_menu.e2e.ts on Android in CI run
// 27273317261. The field names themselves are correct for RN 0.83 — only the
// null target is the problem.
//
// Fix: treat a missing reactHost/reactInstance/timerManager as "no active
// timers" — semantically correct because a not-yet-created or torn-down
// instance cannot have timers pending.
//
// NOTE: like the patch above, this modifies .kt source in `node_modules/detox`
// and only takes effect because gradle compiles Detox from source
// (android/settings.gradle `include ':detox'`).
const timersReflectedPath = path.join(
    __dirname, '..', 'node_modules', 'detox',
    'android', 'detox', 'src', 'full', 'java', 'com', 'wix', 'detox',
    'reactnative', 'idlingresources', 'timers',
    'JavaTimersReflected.kt',
);

function applyTimersReflectedPatch(kt) {
    const patchedMarker = '// mattermost-mobile patch: null-guard reactInstance chain';
    if (kt.includes(patchedMarker)) {
        return {kt, msg: 'already applied (null-guard)'};
    }

    const originalCaller =
        '        val timersManager = getTimersManager(reactContext)\n' +
        '        val hasActiveTimersInRangeInstanceClass = timersManager::class\n';
    const patchedCaller =
        '        ' + patchedMarker + ':\n' +
        '        // a null timers manager means the instance is starting up or tearing\n' +
        '        // down, which trivially has no active timers.\n' +
        '        val timersManager = getTimersManager(reactContext) ?: return false\n' +
        '        val hasActiveTimersInRangeInstanceClass = timersManager::class\n';

    const originalGetter =
        '    private fun getTimersManager(reactContext: ReactContext): JavaTimerManager {\n';
    const patchedGetter =
        '    private fun getTimersManager(reactContext: ReactContext): JavaTimerManager? {\n';

    const originalChain =
        '        val reactHost = Reflect.on(reactContext).field(reactHostFieldName).get<Any>()\n' +
        '        val reactInstance = Reflect.on(reactHost).field(reactInstanceFieldName).get<Any>()\n' +
        '        return Reflect.on(reactInstance).field(javaTimerManagerFieldName).get() as JavaTimerManager\n';
    const patchedChain =
        '        val reactHost = Reflect.on(reactContext).field(reactHostFieldName).get<Any?>()\n' +
        '            ?: return null\n' +
        '        val reactInstance = Reflect.on(reactHost).field(reactInstanceFieldName).get<Any?>()\n' +
        '            ?: return null\n' +
        '        return Reflect.on(reactInstance).field(javaTimerManagerFieldName).get() as? JavaTimerManager\n';

    if (!kt.includes(originalCaller) || !kt.includes(originalGetter) || !kt.includes(originalChain)) {
        return {kt, msg: 'pattern not found (Detox source layout changed?), skipping'};
    }

    let out = kt;
    out = out.replace(originalCaller, patchedCaller);
    out = out.replace(originalGetter, patchedGetter);
    out = out.replace(originalChain, patchedChain);
    return {kt: out, msg: 'patched (null-guard)'};
}

if (fs.existsSync(timersReflectedPath)) {
    const kt = fs.readFileSync(timersReflectedPath, 'utf8');
    const {kt: patched, msg} = applyTimersReflectedPatch(kt);
    if (patched !== kt) {
        fs.writeFileSync(timersReflectedPath, patched, 'utf8');
    }
    console.log(`postinstall: JavaTimersReflected ${msg}`);
} else {
    console.log('postinstall: JavaTimersReflected.kt not found, skipping null-guard patch');
}
