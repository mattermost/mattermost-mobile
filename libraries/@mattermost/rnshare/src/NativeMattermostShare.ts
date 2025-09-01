// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type TurboModule, TurboModuleRegistry} from 'react-native';

import type {Double} from 'react-native/Libraries/Types/CodegenTypes';

export type SharedItem = Readonly<{
  extension: string;
  filename?: string;
  isString: boolean;
  size?: Double;
  type: string;
  value: string;
  height?: Double;
  width?: Double;
  videoThumb?: string;
}>;

export type ShareExtensionDataToSend = {
  channelId: string;
  files: SharedItem[];
  message: string;
  serverUrl: string;
  token: string;
  userId: string;
  preauthSecret?: string;
}

export interface Spec extends TurboModule {
  getCurrentActivityName: () => string;
  clear: () => void;
  close: (data: ShareExtensionDataToSend | null) => void;
  getSharedData: () => Promise<SharedItem[]>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MattermostShare');
