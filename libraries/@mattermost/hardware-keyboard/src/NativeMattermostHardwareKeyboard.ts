// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {type TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  addListener: (eventType: string) => void;
  removeListeners: (count: number) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MattermostHardwareKeyboard');
