//
//  MattermostManaged.m
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import "MattermostManaged.h"

@implementation MattermostManaged

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

-(NSString *)appGroupId {
    NSBundle *bundle = [NSBundle mainBundle];
    NSString *appGroupId = [bundle objectForInfoDictionaryKey:@"AppGroupIdentifier"];
    return appGroupId;
}


-(NSString * ) appGroupSharedDirectory {
  NSURL *sharedDirectory = [[NSFileManager defaultManager] containerURLForSecurityApplicationGroupIdentifier: [self appGroupId]];
  
  return [sharedDirectory path];
}

- (NSDictionary *)constantsToExport {
  return @{
           @"appGroupIdentifier": [self appGroupId],
           @"appGroupSharedDirectory" : [self appGroupSharedDirectory]
           };
}

RCT_EXPORT_METHOD(isRunningInSplitView:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  BOOL isRunningInFullScreen = CGRectEqualToRect(
                                                 [UIApplication sharedApplication].delegate.window.frame,
                                                 [UIApplication sharedApplication].delegate.window.screen.bounds);
  resolve(@{
            @"isSplitView": @(!isRunningInFullScreen)
            });
}

@end
