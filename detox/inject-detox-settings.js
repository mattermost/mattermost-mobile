// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Paths to files
const androidManifestPath = path.resolve(
    __dirname,
    '../android/app/src/debug/AndroidManifest.xml',
);
const settingsGradlePath = path.resolve(__dirname, '../android/settings.gradle');

// Detox code to add to settings.gradle
const detoxSettings = `
include ':detox'
project(':detox').projectDir = new File(rootProject.projectDir, '../detox/node_modules/detox/android')
`;

// Updated AndroidManifest.xml content
const updatedManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          xmlns:tools="http://schemas.android.com/tools"
          package="com.mattermost.rnbeta">

    <application
        android:usesCleartextTraffic="true"
        tools:targetApi="28"
        tools:ignore="GoogleAppIndexingWarning">
        <activity
            android:name="androidx.test.core.app.InstrumentationActivityInvoker$BootstrapActivity"
            android:exported="true" 
            tools:node="replace"/>
        <activity
            android:name="androidx.test.core.app.InstrumentationActivityInvoker$EmptyActivity"
            android:exported="true" 
            tools:node="replace"/>
        <activity
            android:name="androidx.test.core.app.InstrumentationActivityInvoker$EmptyFloatingActivity"
            android:exported="true" 
            tools:node="replace"/>
    </application>
</manifest>`;

// Update AndroidManifest.xml
function updateAndroidManifest() {
    try {
        fs.writeFileSync(androidManifestPath, updatedManifest, 'utf-8');
        console.log('AndroidManifest.xml updated successfully.');
    } catch (err) {
        console.error(`Failed to update AndroidManifest.xml: ${err.message}`);
    }
}

// Update settings.gradle
function updateSettingsGradle() {
    try {
        const content = fs.readFileSync(settingsGradlePath, 'utf-8');
        if (content.includes("include ':detox'")) {
            console.log('Detox settings already present in settings.gradle.');
            return;
        }
        fs.writeFileSync(settingsGradlePath, content + detoxSettings, 'utf-8');
        console.log('settings.gradle updated successfully.');
    } catch (err) {
        console.error(`Failed to update settings.gradle: ${err.message}`);
    }
}

// Run updates
updateAndroidManifest();
updateSettingsGradle();
