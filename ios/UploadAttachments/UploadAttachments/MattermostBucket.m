#import "MattermostBucket.h"
#import "MMMConstants.h"

@implementation MattermostBucket

-(NSUserDefaults *)bucketByName:(NSString*)name {
  return [[NSUserDefaults alloc] initWithSuiteName: name];
}

-(NSString *)appGroupId {
    NSBundle *bundle = [NSBundle mainBundle];
    NSString *appGroupId = [bundle objectForInfoDictionaryKey:@"AppGroupIdentifier"];
    return appGroupId;
}

-(NSString *)fileUrl:(NSString *)fileName {
  NSURL *fileManagerURL = [[NSFileManager defaultManager] containerURLForSecurityApplicationGroupIdentifier:[self appGroupId]];
  return [NSString stringWithFormat:@"%@/%@", fileManagerURL.path, fileName];
}

-(id) getPreference:(NSString *)key {
  NSUserDefaults* bucket = [self bucketByName: [self appGroupId]];
  return [bucket objectForKey:key];
}

-(NSString *)readFromFile:(NSString *)fileName {
  NSString *filePath = [self fileUrl:fileName];
  NSFileManager *fileManager= [NSFileManager defaultManager];
  if(![fileManager fileExistsAtPath:filePath]) {
    return nil;
  }
  return [NSString stringWithContentsOfFile:filePath encoding:NSUTF8StringEncoding error:nil];
}

-(NSDictionary *)readFromFileAsJSON:(NSString *)fileName {
  NSString *filePath = [self fileUrl:fileName];
  NSFileManager *fileManager= [NSFileManager defaultManager];
  if(![fileManager fileExistsAtPath:filePath]) {
    return nil;
  }

  NSData *data = [NSData dataWithContentsOfFile:filePath];
  if (data != nil) {
    return [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingMutableContainers error:nil];
  }

  return nil;
}

-(void)removeFile:(NSString *)fileName {
  NSString *filePath = [self fileUrl:fileName];
  NSFileManager *fileManager= [NSFileManager defaultManager];
  if([fileManager isDeletableFileAtPath:filePath]) {
    [fileManager removeItemAtPath:filePath error:nil];
  }
}

-(void) removePreference:(NSString *)key {
  NSUserDefaults* bucket = [self bucketByName: [self appGroupId]];
  [bucket removeObjectForKey: key];
}

-(void) setPreference:(NSString *)key value:(NSString *) value {
  NSUserDefaults* bucket = [self bucketByName: [self appGroupId]];
  if (bucket && [key length] > 0 && [value length] > 0) {
    [bucket setObject:value forKey:key];
  }
}

-(void)writeToFile:(NSString *)fileName content:(NSString *)content {
  NSString *filePath = [self fileUrl:fileName];
  NSFileManager *fileManager= [NSFileManager defaultManager];
  if(![fileManager fileExistsAtPath:filePath]) {
    [fileManager createFileAtPath:filePath contents:nil attributes:nil];
  }
  if ([content length] > 0) {
    [content writeToFile:filePath atomically:YES encoding:NSUTF8StringEncoding error:nil];
  }
}
@end
