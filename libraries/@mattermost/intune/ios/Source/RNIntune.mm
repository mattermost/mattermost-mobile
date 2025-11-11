// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

#import "RNIntune.h"

// Make sure IntuneMAMSwift types are visible first
#if __has_feature(objc_modules)
@import IntuneMAMSwift;   // preferred if modules are on
#else
#import <IntuneMAMSwift/IntuneMAMSwift.h>
#endif

#if __has_include(<mattermost_intune/mattermost_intune-Swift.h>)
#import <mattermost_intune/mattermost_intune-Swift.h>
#elif __has_include("mattermost_intune-Swift.h")
#import "mattermost_intune-Swift.h"
#else
# error "Unable to find mattermost_intune-Swift.h. Ensure the pod target has Swift sources and DEFINES_MODULE=YES."
#endif

@interface RNIntune() <IntuneManagerDelegate>
@end

@implementation RNIntune {
    IntuneEnrollmentManager *manager;
    BOOL hasListeners;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        manager = [IntuneEnrollmentManager shared];
        manager.delegate = self;
    }
    return self;
}

#pragma mark - IntuneManagerDelegate

- (void)sendEventWithName:(NSString *)name body:(NSDictionary *)body {
    if (hasListeners) {
        [self sendEventWithName:name body:body];
    }
}

- (NSArray<NSString *> *)supportedEvents {
    return [IntuneEnrollmentManager supportedEvents];
}

- (void)startObserving {
    hasListeners = YES;
}

- (void)stopObserving {
    hasListeners = NO;
}

#pragma mark - TurboModule Methods

RCT_EXPORT_METHOD(attachAndEnroll:(NSString *)serverUrl
                  loginHint:(NSString *)loginHint
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [manager attachAndEnrollWithServerUrl:serverUrl loginHint:loginHint completion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(@"intune_enrollment_failed", error.localizedDescription, error);
        } else {
            resolve(result);
        }
    }];
}

RCT_EXPORT_METHOD(getEnrolledAccount:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *oid = [manager getEnrolledAccount];
    resolve(oid ?: [NSNull null]);
}

RCT_EXPORT_METHOD(isManagedServer:(NSString *)serverUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL isManaged = [manager isManagedServer:serverUrl];
    resolve(@(isManaged));
}

RCT_EXPORT_METHOD(deregisterAndUnenroll:(NSString *)serverUrl
                  oid:(NSString *)oid
                  doWipe:(BOOL)doWipe
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [manager deregisterAndUnenrollWithServerUrl:serverUrl oid:oid doWipe:doWipe];
    resolve(nil);
}

RCT_EXPORT_METHOD(setCurrentIdentity:(NSString *)serverUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [manager setCurrentIdentityForServerUrl:serverUrl];
    resolve(nil);
}

RCT_EXPORT_METHOD(getPolicy:(NSString *)serverUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSDictionary *policy = [manager getPolicyForServerUrl:serverUrl];
    resolve(policy ?: [NSNull null]);
}

RCT_EXPORT_METHOD(isScreenCaptureAllowed:(NSString *)serverUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL allowed = [manager isScreenCaptureAllowedForServerUrl:serverUrl];
    resolve(@(allowed));
}

RCT_EXPORT_METHOD(canSaveToLocation:(nonnull NSNumber *)location
                  serverUrl:(NSString *)serverUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL canSave = [manager canSaveToLocation:[location intValue] serverUrl:serverUrl];
    resolve(@(canSave));
}

@end
