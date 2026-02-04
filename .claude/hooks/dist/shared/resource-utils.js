"use strict";
/**
 * System Resource Query Utility
 *
 * Provides functions to query system resources (RAM, CPU) using Node.js os module.
 * Used by resource limit hooks to determine available capacity for agent spawning.
 *
 * Part of Phase 1: RAM Query Utility
 * See: docs/handoffs/resource-limits-plan.md
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemResources = getSystemResources;
var os = __importStar(require("os"));
/**
 * Get current system resource information.
 *
 * Uses Node.js os module to query:
 * - os.freemem() for available memory
 * - os.totalmem() for total memory
 * - os.cpus().length for CPU core count
 * - os.loadavg() for system load averages
 *
 * @returns SystemResources object with current resource values
 *
 * @example
 * ```typescript
 * import { getSystemResources } from './shared/resource-utils.js';
 *
 * const resources = getSystemResources();
 * console.log(`Free RAM: ${resources.freeRAM / 1024 / 1024} MB`);
 * console.log(`CPU Cores: ${resources.cpuCores}`);
 * ```
 */
function getSystemResources() {
    return {
        freeRAM: os.freemem(),
        totalRAM: os.totalmem(),
        cpuCores: os.cpus().length,
        loadAvg: os.loadavg(),
    };
}
