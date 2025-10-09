//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

__attribute__((visibility("default")))
@interface IntuneMAMDiagnosticConsole : NSObject

//Immediately displays the Intune Diagnostic Console
+ (void) displayDiagnosticConsole;

// Returns a dictionary of diagnostic information
+ (NSDictionary*_Nullable) getDiagnosticInformation;

// Returns an array containing the string paths of the Intune SDK log files
// including the standard log file and the diagnostic log file.
// These files can then be uploaded to a back-end of the application's choosing.
+ (NSArray<NSString*>*_Nullable) getIntuneLogPaths;

@end
