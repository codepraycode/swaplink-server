import { prisma } from '../../../shared/database';
import { redisConnection } from '../../../shared/config/redis.config';
import os from 'os';

class SystemService {
    async checkHealth() {
        const health = {
            status: 'OK',
            services: {
                database: 'UNKNOWN',
                redis: 'UNKNOWN',
            },
            timestamp: new Date().toISOString(),
        };

        // Check Database
        try {
            await prisma.$queryRaw`SELECT 1`;
            health.services.database = 'UP';
        } catch (error) {
            health.services.database = 'DOWN';
            health.status = 'ERROR';
        }

        // Check Redis
        try {
            const ping = await redisConnection.ping();
            if (ping === 'PONG') {
                health.services.redis = 'UP';
            } else {
                throw new Error('Redis ping failed');
            }
        } catch (error) {
            health.services.redis = 'DOWN';
            health.status = 'ERROR';
        }

        return health;
    }

    getSystemInfo() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        return {
            os: {
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                cpus: os.cpus().length,
            },
            memory: {
                total: this.formatBytes(totalMem),
                free: this.formatBytes(freeMem),
                used: this.formatBytes(usedMem),
                usagePercentage: ((usedMem / totalMem) * 100).toFixed(2) + '%',
            },
            process: {
                uptime: this.formatUptime(process.uptime()),
                nodeVersion: process.version,
                pid: process.pid,
                memoryUsage: process.memoryUsage(),
            },
            timestamp: new Date().toISOString(),
        };
    }

    private formatBytes(bytes: number, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    private formatUptime(seconds: number) {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${d}d ${h}h ${m}m ${s}s`;
    }
}

export const systemService = new SystemService();
