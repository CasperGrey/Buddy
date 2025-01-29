export const DEBUG = process.env.NODE_ENV === 'development';

export function debugLog(component: string, ...args: any[]) {
  if (DEBUG) {
    console.log(`[${component}]`, ...args);
  }
}
