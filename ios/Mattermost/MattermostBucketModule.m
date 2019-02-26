#import "MattermostBucketModule.h"
#import "MattermostBucket.h"

@implementation MattermostBucketModule

RCT_EXPORT_MODULE();

+(BOOL)requiresMainQueueSetup
{
  return YES;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    self.bucket = [[MattermostBucket alloc] init];
  }
  return self;
}

RCT_EXPORT_METHOD(writeToFile:(NSString *)fileName
                  content:(NSString *)content) {
  [self.bucket writeToFile:fileName content:content];
}

RCT_EXPORT_METHOD(readFromFile:(NSString *)fileName
                  getWithResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  id value = [self.bucket readFromFile:fileName];
  
  if (value == nil) {
    value = [NSNull null];
  }
  
  resolve(value);
}

RCT_EXPORT_METHOD(removeFile:(NSString *)fileName)
{
  [self.bucket removeFile:fileName];
}

RCT_EXPORT_METHOD(setPreference:(NSString *) key
                  value:(NSString *) value)
{
  [self.bucket setPreference:key value:value];
}

RCT_EXPORT_METHOD(getPreference:(NSString *) key
                  getWithResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  id value = [self.bucket getPreference:key];
  
  if (value == nil) {
    value = [NSNull null];
  }
  
  resolve(value);
}

RCT_EXPORT_METHOD(removePreference:(NSString *) key)
{
  [self.bucket removePreference:key];
}
@end
