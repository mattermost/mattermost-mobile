// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type Control = 'play' | 'pause' | 'seek' | 'rewind' | 'forward' | 'selectSpeed' | 'closeSpeedMenu' | 'speed' | 'fullscreen' | 'captions';

export interface VideoControlAction {
    handleControlAction: (control: Control, action?: () => void) => void;
}
