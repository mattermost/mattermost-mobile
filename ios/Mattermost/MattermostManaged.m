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


-(NSDictionary * ) appGroupSharedDirectory {
  NSFileManager *fileManager = [NSFileManager defaultManager];
  NSURL *sharedDirectory = [fileManager containerURLForSecurityApplicationGroupIdentifier: [self appGroupId]];
  NSURL * databasePath = [sharedDirectory URLByAppendingPathComponent:@"databases"];

  [fileManager createDirectoryAtPath:[databasePath path]
                                  withIntermediateDirectories:true
                                  attributes:nil
                                  error:nil
   ];
   return  @{
             @"sharedDirectory": [sharedDirectory path ],
             @"databasePath" : [databasePath path]
   };
}



- (NSDictionary *)constantsToExport {
  return @{
           @"appGroupIdentifier": [self appGroupId],
           @"appGroupSharedDirectory" : [self appGroupSharedDirectory]
           };
}

RCT_EXPORT_METHOD(isRunningInSplitView:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  BOOL isRunningInFullScreen = CGRectEqualToRect(
                                                 [UIApplication sharedApplication].delegate.window.frame,
                                                 [UIApplication sharedApplication].delegate.window.screen.bounds);
  resolve(@{
            @"isSplitView": @(!isRunningInFullScreen)
            });
}

RCT_EXPORT_METHOD(deleteDatabaseDirectory: (NSString *)databaseName  shouldRemoveDirectory: (BOOL) shouldRemoveDirectory callback: (RCTResponseSenderBlock)callback){
  @try {
    NSDictionary *appGroupDir = [self appGroupSharedDirectory];
    NSString *databaseDir;

    if(databaseName){
      databaseDir = [NSString stringWithFormat:@"%@/%@%@", appGroupDir[@"databasePath"], databaseName , @".db"];
    }
  
    if(shouldRemoveDirectory){
      databaseDir = appGroupDir[@"databasePath"];
    }


    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSError *error = nil;

    if (!shouldRemoveDirectory && [fileManager fileExistsAtPath:[NSString stringWithFormat:@"%@-wal", databaseDir]]) {
      [fileManager removeItemAtPath:[NSString stringWithFormat:@"%@-wal", databaseDir] error:nil];
    }
    
    if (!shouldRemoveDirectory && [fileManager fileExistsAtPath:[NSString stringWithFormat:@"%@-shm", databaseDir]]) {
      [fileManager removeItemAtPath:[NSString stringWithFormat:@"%@-shm", databaseDir] error:nil];
    }
    
    BOOL  successCode  = [fileManager removeItemAtPath:databaseDir error:&error];
    NSNumber *success= [NSNumber numberWithBool:successCode];

    callback(@[(error ?: [NSNull null]), success]);
  }
  @catch (NSException *exception) {
      NSLog(@"%@", exception.reason);
    callback(@[exception.reason, @NO]);
  }
}

RCT_EXPORT_METHOD(deleteEntititesFile: (RCTResponseSenderBlock) callback) {
  @try {
    NSDictionary *appGroupDir = [self appGroupSharedDirectory];
    NSString *entities = [NSString stringWithFormat:@"%@/entities", appGroupDir[@"sharedDirectory"]];
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSError *error = nil;

    BOOL  successCode  = [fileManager removeItemAtPath:entities error:&error];
    NSNumber *success= [NSNumber numberWithBool:successCode];
    callback(@[success]);
  }
  @catch (NSException *exception) {
    callback(@[@NO]);
  }
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {
  // Keep: Required for RN built in Event Emitter Calls.
}

RCT_EXPORT_METHOD(removeListeners:(double)count) {
  // Keep: Required for RN built in Event Emitter Calls.
}

@end
