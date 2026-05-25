// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

#import "MMCallsNative.h"

#import <CallKit/CallKit.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "MMCallsNativeSpec.h"

using namespace facebook::react;
#endif

#if __has_include(<mattermost_calls_native/mattermost_calls_native-Swift.h>)
#import <mattermost_calls_native/mattermost_calls_native-Swift.h>
#elif __has_include("mattermost_calls_native-Swift.h")
#import "mattermost_calls_native-Swift.h"
#else
# error "Unable to find mattermost_calls_native-Swift.h. Ensure the pod target has Swift sources and DEFINES_MODULE=YES."
#endif

@interface MMCallsNative () <CallsBridgeDelegate>
@end

@implementation MMCallsNative {
    BOOL hasListeners;
}

RCT_EXPORT_MODULE(MMCallsNative)

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        [CallsBridge shared].delegate = self;
    }
    return self;
}

#pragma mark - CallsBridgeDelegate

- (void)sendEventWithName:(NSString *)name body:(NSDictionary<NSString *,id> *)body {
    if (hasListeners) {
        [super sendEventWithName:name body:body];
    }
}

- (NSArray<NSString *> *)supportedEvents {
    return [CallsBridge supportedEvents];
}

- (void)startObserving {
    hasListeners = YES;
    [[CallsBridge shared] markJSListenersReady];
}

- (void)stopObserving {
    hasListeners = NO;
    [[CallsBridge shared] markJSListenersGone];
}

#pragma mark - Module methods

#ifndef RCT_NEW_ARCH_ENABLED
RCT_EXPORT_METHOD(reportOutgoingCall:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self reportOutgoingCallImpl:params resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(reportConnected:(NSString *)uuidString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self reportConnectedImpl:uuidString resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(reportEnded:(NSString *)uuidString
                  reason:(NSString *)reason
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self reportEndedImpl:uuidString reason:reason resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(setMuted:(NSString *)uuidString
                  muted:(BOOL)muted
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self setMutedImpl:uuidString muted:muted resolve:resolve reject:reject];
}

// iOS no-ops. The Android foreground service keeps the mic alive during a
// backgrounded call; on iOS the `audio` background mode + AVAudioSession
// configuration owned by CallKitProvider serves the same purpose without
// needing a foreground service.
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(foregroundServiceStart:(NSDictionary *)config) {
    return nil;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(foregroundServiceStop) {
    return nil;
}
#endif

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params {
    return std::make_shared<NativeMMCallsNativeSpecJSI>(params);
}

- (void)reportOutgoingCall:(JS::NativeMMCallsNative::OutgoingCallParams &)params
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    NSDictionary *dict = @{
        @"channelId": params.channelId() ?: @"",
        @"calleeName": params.calleeName() ?: @"",
    };
    [self reportOutgoingCallImpl:dict resolve:resolve reject:reject];
}

- (void)reportConnected:(NSString *)uuid
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [self reportConnectedImpl:uuid resolve:resolve reject:reject];
}

- (void)reportEnded:(NSString *)uuid
             reason:(NSString *)reason
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
    [self reportEndedImpl:uuid reason:reason resolve:resolve reject:reject];
}

- (void)setMuted:(NSString *)uuid
           muted:(BOOL)muted
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
    [self setMutedImpl:uuid muted:muted resolve:resolve reject:reject];
}

- (void)foregroundServiceStart:(JS::NativeMMCallsNative::ForegroundNotificationConfig &)config {
    // no-op
}

- (void)foregroundServiceStop {
    // no-op
}
#endif

#pragma mark - Private impls (shared between Old & New Arch)

- (void)reportOutgoingCallImpl:(NSDictionary *)params
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    NSString *channelID = [RCTConvert NSString:params[@"channelId"]] ?: @"";
    NSString *calleeName = [RCTConvert NSString:params[@"calleeName"]] ?: @"";

    [[CallsBridge shared].callKitProvider
        reportOutgoingCallWithChannelID:channelID
                              calleeName:calleeName
                              completion:^(NSUUID * _Nullable uuid, NSError * _Nullable error) {
        if (error || uuid == nil) {
            reject(@"report_outgoing_failed",
                   error.localizedDescription ?: @"Failed to report outgoing call",
                   error);
            return;
        }
        resolve(@{@"uuid": uuid.UUIDString});
    }];
}

- (void)reportConnectedImpl:(NSString *)uuidString
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:uuidString];
    if (uuid == nil) {
        reject(@"invalid_uuid", @"Invalid call UUID", nil);
        return;
    }
    [[CallsBridge shared].callKitProvider reportConnectedWithUuid:uuid];
    resolve(nil);
}

- (void)reportEndedImpl:(NSString *)uuidString
                 reason:(NSString *)reason
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:uuidString];
    if (uuid == nil) {
        reject(@"invalid_uuid", @"Invalid call UUID", nil);
        return;
    }

    CXCallEndedReason cxReason = CXCallEndedReasonRemoteEnded;
    if ([reason isEqualToString:@"declined"]) {
        cxReason = CXCallEndedReasonDeclinedElsewhere;
    } else if ([reason isEqualToString:@"unanswered"]) {
        cxReason = CXCallEndedReasonUnanswered;
    } else if ([reason isEqualToString:@"failed"]) {
        cxReason = CXCallEndedReasonFailed;
    }

    [[CallsBridge shared].callKitProvider reportEndedWithUuid:uuid reason:cxReason];
    resolve(nil);
}

- (void)setMutedImpl:(NSString *)uuidString
               muted:(BOOL)muted
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:uuidString];
    if (uuid == nil) {
        reject(@"invalid_uuid", @"Invalid call UUID", nil);
        return;
    }
    [[CallsBridge shared].callKitProvider setMutedWithUuid:uuid
                                                     muted:muted
                                                completion:^(NSError * _Nullable error) {
        if (error) {
            reject(@"set_muted_failed", error.localizedDescription, error);
            return;
        }
        resolve(nil);
    }];
}

@end
