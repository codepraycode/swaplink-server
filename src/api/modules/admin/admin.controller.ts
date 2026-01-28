import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { BadRequestError } from '../../../shared/lib/utils/api-error';

export class AdminController {
    /**
     * Get all disputed orders
     */
    async getDisputes(req: Request, res: Response) {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;

        const result = await adminService.getDisputes(page, limit);
        res.json(result);
    }

    /**
     * Get dispute details
     */
    async getDisputeDetails(req: Request, res: Response) {
        const { id } = req.params;
        const result = await adminService.getOrderDetails(id);
        res.json(result);
    }

    /**
     * Resolve a dispute
     */
    async resolveDispute(req: Request, res: Response) {
        const { id } = req.params;
        const { decision, notes } = req.body;
        const adminId = req.user!.userId;

        // Extract IP
        const ipAddress =
            (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '0.0.0.0';

        if (!decision || !['RELEASE', 'REFUND'].includes(decision)) {
            throw new BadRequestError('Invalid decision. Must be RELEASE or REFUND.');
        }

        if (!notes) {
            throw new BadRequestError('Resolution notes are required for audit.');
        }

        const result = await adminService.resolveDispute(adminId, id, decision, notes, ipAddress);
        res.json(result);
    }

    /**
     * Create a new Admin
     */
    async createAdmin(req: Request, res: Response) {
        const adminId = req.user!.userId;
        const ipAddress =
            (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '0.0.0.0';

        const result = await adminService.createAdmin(req.body, adminId, ipAddress);
        res.status(201).json(result);
    }

    /**
     * List all admins
     */
    async getAdmins(req: Request, res: Response) {
        const result = await adminService.getAdmins();
        res.json(result);
    }
}

export const adminController = new AdminController();
