/**
 * Minimal type declaration for Moltbot plugin runtime (clawdbot/plugin-sdk).
 * The real types are provided by Moltbot when the plugin is loaded.
 */
declare module "clawdbot/plugin-sdk" {
  export interface MoltbotPluginApi {
    pluginConfig?: Record<string, unknown>;
    logger?: { info?: (msg: string) => void; warn?: (msg: string) => void };
    registerTool: (tool: unknown, opts?: { name: string }) => void;
    registerCli: (registrar: (params: { program: unknown }) => void, opts?: { commands?: string[] }) => void;
    on: (event: string, handler: (event: unknown) => void | Promise<void | unknown>) => void;
    registerService: (service: { id: string; start: () => Promise<void>; stop: () => void }) => void;
  }
}
