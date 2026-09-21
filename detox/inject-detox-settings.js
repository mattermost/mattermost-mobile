// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Path to APNG4Android gif AndroidManifest.xml
const apngGifManifestPath = path.resolve(
    __dirname,
    '../node_modules/APNG4Android/gif/src/androidTest/AndroidManifest.xml',
);

// Content for APNG4Android gif AndroidManifest.xml
const apngGifManifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
    <application>
        <activity
            android:name="androidx.test.core.app.InstrumentationActivityInvoker$BootstrapActivity"
            android:exported="true"
            tools:node="merge" />
        <activity
            android:name="androidx.test.core.app.InstrumentationActivityInvoker$EmptyActivity"
            android:exported="true" 
            tools:node="merge" />
        <activity
            android:name="androidx.test.core.app.InstrumentationActivityInvoker$EmptyFloatingActivity"
            android:exported="true"
            tools:node="merge" />
    </application>
</manifest>`;

// Path to APNG4Android frameanimation AndroidManifest.xml
const apngFrameAnimationManifestPath = path.resolve(
    __dirname,
    '../node_modules/APNG4Android/frameanimation/src/androidTest/AndroidManifest.xml',
);

// Content for APNG4Android frameanimation AndroidManifest.xml
const apngFrameAnimationManifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
    <application>
        <activity
            android:name="androidx.test.core.app.InstrumentationActivityInvoker$BootstrapActivity"
            android:exported="false"
            tools:node="merge" />
        <activity
            android:name="androidx.test.core.app.InstrumentationActivityInvoker$EmptyActivity"
            android:exported="false"
            tools:node="merge" />
        <activity
            android:name="androidx.test.core.app.InstrumentationActivityInvoker$EmptyFloatingActivity"
            android:exported="false"
            tools:node="merge" />
    </application>
</manifest>`;

// Function to create AndroidManifest.xml for APNG4Android gif
function createApngGifManifest() {
    try {
        fs.mkdirSync(path.dirname(apngGifManifestPath), {recursive: true});
        fs.writeFileSync(apngGifManifestPath, apngGifManifestContent, 'utf-8');
        console.log('APNG4Android gif AndroidManifest.xml created successfully.');
    } catch (err) {
        console.error(`Failed to create APNG4Android gif AndroidManifest.xml: ${err.message}`);
    }
}

// Function to create AndroidManifest.xml for APNG4Android frameanimation
function createApngFrameAnimationManifest() {
    try {
        fs.mkdirSync(path.dirname(apngFrameAnimationManifestPath), {recursive: true});
        fs.writeFileSync(apngFrameAnimationManifestPath, apngFrameAnimationManifestContent, 'utf-8');
        console.log('APNG4Android frameanimation AndroidManifest.xml created successfully.');
    } catch (err) {
        console.error(`Failed to create APNG4Android frameanimation AndroidManifest.xml: ${err.message}`);
    }
}

// Run updates
createApngGifManifest();
createApngFrameAnimationManifest();
