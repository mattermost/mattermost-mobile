//
//  MattermostBucket.m
//  Mattermost
//
//  Created by Elias Nahum on 12/11/17.
//  Copyright © 2017 Facebook. All rights reserved.
//

#import "MattermostBucket.h"

@implementation MattermostBucket

- (NSUserDefaults *)bucketByName:(NSString*)name {
  return [[NSUserDefaults alloc] initWithSuiteName: name];
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(set:(NSString *) key
                  value:(NSString *) value
                  bucketName:(NSString*) bucketName)
{
  NSUserDefaults* bucket = [self bucketByName: bucketName];
  [bucket setObject:value forKey:key];
}

RCT_EXPORT_METHOD(get:(NSString *) key
                  bucketName:(NSString*) bucketName
                  getWithResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults* bucket = [self bucketByName: bucketName];
  id value = [bucket objectForKey:key];
  
  if (value == nil) {
    value = [NSNull null];
  }
  
  resolve(value);
}

RCT_EXPORT_METHOD(remove:(NSString *) key
                  bucketName:(NSString*) bucketName)
{
  NSUserDefaults* bucket = [self bucketByName: bucketName];
  [bucket removeObjectForKey: key];
}

@end
