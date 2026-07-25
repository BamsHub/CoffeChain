// `developer` dan `admin` adalah dua nama role administrator yang setara.
export const PAYMENT_ROLES = Object.freeze(['farmer', 'koperasi', 'developer', 'admin']);

export function canMakePayment(role) {
    return typeof role === 'string' && PAYMENT_ROLES.includes(role);
}
