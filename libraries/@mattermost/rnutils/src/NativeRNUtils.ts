// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type TurboModule, TurboModuleRegistry} from 'react-native';

import type {Double, Int32, UnsafeObject} from 'react-native/Libraries/Types/CodegenTypes';

export type SplitView = Readonly<{
  isSplit: boolean;
  isTablet: boolean;
}>

type DatabaseOperationResult = Readonly<{
  error?: string | null;
  success: boolean;
}>

type Notification = Readonly<{
  identifier: string;
  payload?: UnsafeObject;
  title?: string;
  body?: string;
  sound?: string;
  badge?: Int32;
  type?: string;
  thread?: string;
  channel_id?: string;
  root_id?: string;
}>

type Constants = Readonly<{
  appGroupIdentifier: string;
  appGroupSharedDirectory: Readonly<{
    sharedDirectory: string;
    databasePath: string;
  }>;
}>

export type WindowDimensionsChanged = Readonly<{
  width: Double;
  height: Double;
}>

type HasRegisteredLoadResponse = {
  hasRegisteredLoad: boolean;
}

export interface Spec extends TurboModule {
    readonly getConstants: () => Constants;

    addListener: (eventType: string) => void;
    removeListeners: (count: number) => void;

    getRealFilePath: (filePath: string) => Promise<string>;
    saveFile: (filePath: string) => Promise<string>;

    getWindowDimensions: () => WindowDimensionsChanged;
    isRunningInSplitView: () => SplitView;
    unlockOrientation: () => void;
    lockPortrait: () => void;

    getHasRegisteredLoad: () => HasRegisteredLoadResponse;
    setHasRegisteredLoad: () => void;

    deleteDatabaseDirectory: (databaseName: string, shouldRemoveDirectory: boolean) => DatabaseOperationResult;
    renameDatabase: (databaseName: string, newDatabaseName: string) => DatabaseOperationResult;
    deleteEntitiesFile: () => boolean;

    getDeliveredNotifications(): Promise<Notification[]>;
    removeChannelNotifications(serverUrl: string, channelId: string): void;
    removeThreadNotifications(serverUrl: string, threadId: string): void;
    removeServerNotifications(serverUrl: string): void;

    setSoftKeyboardToAdjustResize(): void;
    setSoftKeyboardToAdjustNothing(): void;

    createZipFile: (paths: string[]) => Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RNUtils');
