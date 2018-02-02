//
//  MattermostBucket.m
//  Mattermost
//
//  Created by Elias Nahum on 12/11/17.
//  Copyright © 2017 Facebook. All rights reserved.
//

#import "MattermostBucket.h"

@implementation MattermostBucket

+(BOOL)requiresMainQueueSetup
{
  return YES;
}

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(writeToFile:(NSString *)fileName
                  content:(NSString *)content
                  bucketName:(NSString *)bucketName) {
  [self writeToFile:fileName content:content appGroupId:bucketName];
}

RCT_EXPORT_METHOD(readFromFile:(NSString *)fileName
                  bucketName:(NSString*)bucketName
                  getWithResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  id value = [self readFromFile:fileName appGroupId:bucketName];
  
  if (value == nil) {
    value = [NSNull null];
  }
  
  resolve(value);
}

RCT_EXPORT_METHOD(removeFile:(NSString *)fileName
                  bucketName:(NSString*)bucketName)
{
  [self removeFile:fileName appGroupId:bucketName];
}

RCT_EXPORT_METHOD(setPreference:(NSString *) key
                  value:(NSString *) value
                  bucketName:(NSString*) bucketName)
{
  [self setPreference:key value:value appGroupId:bucketName];
}

RCT_EXPORT_METHOD(getPreference:(NSString *) key
                  bucketName:(NSString*) bucketName
                  getWithResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  id value = [self getPreference:key appGroupId:bucketName];
  
  if (value == nil) {
    value = [NSNull null];
  }
  
  resolve(value);
}

RCT_EXPORT_METHOD(removePreference:(NSString *) key
                  bucketName:(NSString*) bucketName)
{
  [self removePreference:key appGroupId:bucketName];
}

-(NSString *)fileUrl:(NSString *)fileName appGroupdId:(NSString *)appGroupId {
  NSURL *fileManagerURL = [[NSFileManager defaultManager] containerURLForSecurityApplicationGroupIdentifier:appGroupId];
  return [NSString stringWithFormat:@"%@/%@", fileManagerURL.path, fileName];
}

-(void)writeToFile:(NSString *)fileName content:(NSString *)content appGroupId:(NSString *)appGroupId {
  NSString *filePath = [self fileUrl:fileName appGroupdId:appGroupId];
  NSFileManager *fileManager= [NSFileManager defaultManager];
  if(![fileManager fileExistsAtPath:filePath]) {
    [fileManager createFileAtPath:filePath contents:nil attributes:nil];
  }
  [content writeToFile:filePath atomically:YES encoding:NSUTF8StringEncoding error:nil];
}

-(NSString *)readFromFile:(NSString *)fileName appGroupId:(NSString *)appGroupId {
  NSString *filePath = [self fileUrl:fileName appGroupdId:appGroupId];
  NSFileManager *fileManager= [NSFileManager defaultManager];
  if(![fileManager fileExistsAtPath:filePath]) {
    return nil;
  }
  return [NSString stringWithContentsOfFile:filePath encoding:NSUTF8StringEncoding error:nil];
}

-(void)removeFile:(NSString *)fileName appGroupId:(NSString *)appGroupId {
  NSString *filePath = [self fileUrl:fileName appGroupdId:appGroupId];
  NSFileManager *fileManager= [NSFileManager defaultManager];
  if([fileManager isDeletableFileAtPath:filePath]) {
    [fileManager removeItemAtPath:filePath error:nil];
  }
}

-(NSUserDefaults *)bucketByName:(NSString*)name {
  return [[NSUserDefaults alloc] initWithSuiteName: name];
}

-(void) setPreference:(NSString *)key value:(NSString *) value appGroupId:(NSString*)appGroupId {
  NSUserDefaults* bucket = [self bucketByName: appGroupId];
  [bucket setObject:value forKey:key];
}

-(id) getPreference:(NSString *)key appGroupId:(NSString*)appGroupId {
  NSUserDefaults* bucket = [self bucketByName: appGroupId];
  return [bucket objectForKey:key];
}

-(void) removePreference:(NSString *)key appGroupId:(NSString*)appGroupId {
  NSUserDefaults* bucket = [self bucketByName: appGroupId];
  [bucket removeObjectForKey: key];
}
@end
