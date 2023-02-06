//
//  NativeAccessApi.h
//  AUDScan
//
//  Created by Hossein Amin on 5/22/17.
//
//

#import <Cordova/CDVPlugin.h>

@interface NativeAccessApi : CDVPlugin

- (void)has_synthesizer:(CDVInvokedUrlCommand*)command;
- (void)has_audio_device:(CDVInvokedUrlCommand*)command;
- (void)init_synthesizer:(CDVInvokedUrlCommand*)command;
- (void)init_utterance:(CDVInvokedUrlCommand*)command;
- (void)release_synthesizer:(CDVInvokedUrlCommand*)command;
- (void)release_utterance:(CDVInvokedUrlCommand*)command;
- (void)speak_utterance:(CDVInvokedUrlCommand*)command;
- (void)stop_speaking:(CDVInvokedUrlCommand*)command;

@end
