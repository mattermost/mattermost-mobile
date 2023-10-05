//
//  MattermostManaged.m
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import "MattermostManaged.h"
#import "CreateThumbnail.h"
#import "Mattermost-Swift.h"

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

RCT_EXPORT_METHOD(renameDatabase: (NSString *)databaseName  to: (NSString *) newDBName callback: (RCTResponseSenderBlock)callback){
  @try {
    NSDictionary *appGroupDir = [self appGroupSharedDirectory];
    NSString *databaseDir;
    NSString *newDBDir;
    
    if(databaseName){
      databaseDir = [NSString stringWithFormat:@"%@/%@%@", appGroupDir[@"databasePath"], databaseName , @".db"];
    }

    if (newDBName){
      newDBDir = [NSString stringWithFormat:@"%@/%@%@", appGroupDir[@"databasePath"], newDBName , @".db"];
    }

    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSError *error = nil;

    BOOL destinationHasFile = [fileManager fileExistsAtPath:newDBDir];

    if (!destinationHasFile && [fileManager fileExistsAtPath:[NSString stringWithFormat:@"%@-wal", databaseDir]]) {
      [fileManager moveItemAtPath:[NSString stringWithFormat:@"%@-wal", databaseDir] toPath:[NSString stringWithFormat:@"%@-wal", newDBDir] error:nil];
    }
    
    if (!destinationHasFile && [fileManager fileExistsAtPath:[NSString stringWithFormat:@"%@-shm", databaseDir]]) {
      [fileManager moveItemAtPath:[NSString stringWithFormat:@"%@-shm", databaseDir] toPath:[NSString stringWithFormat:@"%@-shm", newDBDir] error:nil];
    }
    
    BOOL  successCode  = destinationHasFile;
    if (!destinationHasFile &&  [fileManager fileExistsAtPath:databaseDir]){
      successCode = [fileManager moveItemAtPath:databaseDir toPath: newDBDir error:&error];
    }
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

RCT_EXPORT_METHOD(createThumbnail:(NSDictionary *)config findEventsWithResolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  NSMutableDictionary *newConfig = [config mutableCopy];
  NSMutableDictionary *headers = [config[@"headers"] ?: @{} mutableCopy];
  NSString *url = (NSString *)[config objectForKey:@"url"] ?: @"";
  NSURL *vidURL = nil;
  NSString *url_ = [url lowercaseString];
  
  if ([url_ hasPrefix:@"http://"] || [url_ hasPrefix:@"https://"] || [url_ hasPrefix:@"file://"]) {
    vidURL = [NSURL URLWithString:url];
    NSString *serverUrl = [NSString stringWithFormat:@"%@://%@:%@", vidURL.scheme, vidURL.host, vidURL.port];
    if (vidURL != nil) {
      NSString *token = [[GekidouWrapper default] getTokenFor:serverUrl];
      if (token != nil) {

        headers[@"Authorization"] = [NSString stringWithFormat:@"Bearer %@", token];
        newConfig[@"headers"] = headers;
      }
    }
  }
  [CreateThumbnail create:newConfig findEventsWithResolver:resolve rejecter:reject];
}

@end
