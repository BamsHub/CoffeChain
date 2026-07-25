export const PAYMENT_ROLES = Object.freeze(['farmer', 'admin']);

export function canMakePayment(role) {
    return PAYMENT_ROLES.includes(role);
}
