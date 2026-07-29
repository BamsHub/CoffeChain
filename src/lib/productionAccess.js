export const PIPELINE_ACCOUNT_ROLES = Object.freeze([
    'farmer',
    'koperasi',
    'developer',
    'admin',
]);

export const PIPELINE_REVIEW_ROLES = Object.freeze([
    'koperasi',
    'developer',
    'admin',
]);

export function isPipelineAccountRole(role) {
    return PIPELINE_ACCOUNT_ROLES.includes(role);
}

export function canReviewAllPipelines(role) {
    return PIPELINE_REVIEW_ROLES.includes(role);
}

export function ownsPipelineBatch(session, batch) {
    return Boolean(session?.userId && batch?.farmer_id === session.userId);
}
