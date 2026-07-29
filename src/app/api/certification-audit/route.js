export const runtime = 'nodejs';

import { verifyToken } from '@/lib/auth';
import { canReviewAllPipelines } from '@/lib/productionAccess';
import { getProductionCertificationAudit } from '@/lib/productionAudit';

export async function GET(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const productId = new URL(request.url).searchParams.get('productId');
        if (!productId) {
            return Response.json({ success: false, message: 'productId wajib diisi' }, { status: 400 });
        }

        const audit = await getProductionCertificationAudit(productId);
        const isOwner = audit.product.submitted_by === session.userId;
        if (!isOwner && !canReviewAllPipelines(session.role)) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        return Response.json({
            success: true,
            data: {
                eligible: audit.eligible,
                criteria: audit.criteria,
                owner: audit.owner,
                batchId: audit.batch?.id || null,
                productId: audit.product.id,
            },
        });
    } catch (error) {
        return Response.json({
            success: false,
            message: error.message || 'Gagal melakukan audit sertifikasi',
        }, { status: /tidak ditemukan/i.test(error.message || '') ? 404 : 500 });
    }
}
