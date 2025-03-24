// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export {
    loadConfig,
    loadCalls,
    enableChannelCalls,
    joinCall,
    leaveCall,
    muteMyself,
    unmuteMyself,
    raiseHand,
    unraiseHand,
    setSpeakerphoneOn,
    handleCallsSlashCommand,
    startCallRecording,
    stopCallRecording,
    dismissIncomingCall,
    hostMake,
    hostMuteSession,
    hostMuteOthers,
    hostStopScreenshare,
    hostLowerHand,
    hostRemove,
    setPreferredAudioRoute,
    initializeVoiceTrack,
    initializeVideoTrack,
    sendReaction,
    endCall,
    loadCallForChannel,
    loadConfigAndCalls,
    checkIsCallsPluginEnabled,
    canEndCall,
    getEndCallMessage,
    startMyVideo,
    stopMyVideo,
} from './calls';

export {hasMicrophonePermission, hasCameraPermission} from './permissions';
