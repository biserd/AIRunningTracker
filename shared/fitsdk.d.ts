declare module '@garmin/fitsdk' {
 export class Stream {static fromByteArray(bytes:Uint8Array|number[]):Stream}
 export class Decoder {constructor(stream:Stream);isFIT():boolean;checkIntegrity():boolean;read(options?:Record<string,unknown>):{messages:Record<string,any[]>;errors:unknown[]}}
 export class Encoder {constructor(options?:any);writeMesg(message:any):void;close():Uint8Array}
 export const Profile:any;
}
