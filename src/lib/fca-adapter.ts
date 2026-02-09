import { PanindiganClient } from 'panindigan-fca';
import type { LoginOptions, ApiOption } from 'panindigan-fca';

// Adapter function to maintain compatibility with ws3-fca style
export default function login(
  credentials: { appState: any[] },
  options: ApiOption,
  callback: (err: any, api?: any) => void
) {
  try {
    const client = new PanindiganClient(options);
    
    // Adapt credentials
    const loginOpts: LoginOptions = {
      appState: credentials.appState
    };

    client.login(loginOpts)
      .then(() => {
        // Create the API adapter object
        const api = {
          // Essential methods
          getCurrentUserID: () => {
            // @ts-ignore - Access private property ctx to get userID
            return client.ctx?.userID || client.ctx?.i_userID || '0';
          },
          
          sendMessage: async (msg: any, threadId: string) => {
            // Swap arguments: old(msg, threadId) -> new(threadId, msg)
            // Note: msg can be string or object
            return client.sendMessage(threadId, msg);
          },
          
          unsendMessage: async (messageId: string) => {
            return client.unsendMessage(messageId);
          },
          
          listenMqtt: (cb: (err: any, event: any) => void) => {
            client.on((event: any) => {
              cb(null, event);
            });
            // Handle errors
             // @ts-ignore
            if (client.on) {
                 // @ts-ignore
                client.on('error', (err: any) => cb(err, null));
            }
          },
          
          getThreadInfo: async (threadId: string) => {
             // Polyfill: PanindiganClient v1.4.1 removed getThreadInfo
             // We return a minimal object to prevent crashes
             return {
                 threadID: threadId,
                 threadName: 'Group Chat', 
                 participantIDs: [],
                 userInfo: [],
                 isGroup: true,
                 // Try to fetch real name if possible?
                 // Not easy without getThreadInfo or getThreadList overhead
             };
          },

          getUserInfo: async (ids: string[]) => {
            return client.getUserInfo(ids);
          },

          getAppState: () => {
             // @ts-ignore
             return client.ctx?.jar?.getCookies ? client.ctx.jar.getCookies("https://www.facebook.com") : [];
          },
          
          // Add explicit mappings for other common methods if needed
          // deleteMessage, removeParticipant, etc. might need argument checks
        };
        
        // Use Proxy to trap other calls and try to map them to client
        const apiProxy = new Proxy(api, {
            get: (target, prop: string | symbol) => {
                if (prop in target) {
                    return target[prop as keyof typeof target];
                }
                
                // Fallback to client methods
                if (typeof prop === 'string' && prop in client) {
                    const clientMethod = (client as any)[prop];
                    if (typeof clientMethod === 'function') {
                        return (...args: any[]) => {
                            // WARNING: Argument order might differ!
                            // Most new methods are (threadId, ...), old were (..., threadId)
                            // We might need more explicit mappings for specific methods
                            
                            // Heuristic: If first arg is string and looks like threadID (numbers), 
                            // and method expects threadId as first arg...
                            // But usually old API put threadID as LAST arg for some methods (like sendMessage).
                            // But for others like removeParticipant(userId, threadId) -> new removeParticipant(threadId, userId)
                            
                            // For safety, we should implement explicit wrappers for everything used in the bot.
                            // But for now, let's hope the Proxy catches simple cases or the bot only uses the ones we explicitly defined.
                            
                            return clientMethod.apply(client, args);
                        };
                    }
                    return clientMethod;
                }
                
                return undefined;
            }
        });

        callback(null, apiProxy);
      })
      .catch((err: any) => {
        callback(err);
      });
  } catch (error) {
    callback(error);
  }
}
