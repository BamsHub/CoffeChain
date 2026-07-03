/**
 * Script to replace all colorful emoji icons across the entire app
 * with monochrome SVG/Lucide components.
 */
const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) { console.log('Skip (not found):', filePath); return; }
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [from, to] of replacements) {
        if (content.includes(from)) {
            content = content.split(from).join(to);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated:', filePath);
    } else {
        console.log('No changes:', filePath);
    }
}

const root = path.join(__dirname, 'src');

// ──────────────────────────────────────────────────────────────
// 1. AuthContext.jsx — remove colored emoji from ROLE_LABELS
// ──────────────────────────────────────────────────────────────
replaceInFile(path.join(root, 'context/AuthContext.jsx'), [
    ["farmer: { label: 'Petani', emoji: '🌱'", "farmer: { label: 'Petani', emoji: ''"],
    ["koperasi: { label: 'Koperasi', emoji: '🏘️'", "koperasi: { label: 'Koperasi', emoji: ''"],
    ["developer: { label: 'Developer', emoji: '🛠️'", "developer: { label: 'Developer', emoji: ''"],
]);

// ──────────────────────────────────────────────────────────────
// 2. Header.jsx — emoji in notification panel and avatar
// ──────────────────────────────────────────────────────────────
replaceInFile(path.join(root, 'components/Header/Header.jsx'), [
    // Notification title
    ["<span className={styles.notifTitle}>🔔 Notifikasi</span>",
     "<span className={styles.notifTitle}><svg style={{verticalAlign:'middle',marginRight:6}} width='16' height='16' fill='none' viewBox='0 0 24 24'><path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg> Notifikasi</span>"],
    // Empty notification
    ['<div style={{ fontSize: 32 }}>🔕</div>',
     '<div style={{display:"flex",justifyContent:"center",marginBottom:8}}><svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M13.73 21a2 2 0 01-3.46 0M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M1 1l22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></div>'],
    // Notification type icons object
    ["const typeIcon = { product_added: '🛍️', payment: '💳', price: '📈', info: '📢', success: '✅', warning: '⚠️' };",
     "const typeIcon = { product_added: '🛒', payment: '💲', price: '↑', info: 'ℹ', success: '✓', warning: '!' };"],
    // Phantom in profile avatar  
    ["? '👻' : (user?.avatar || 'BK')",
     "? 'P' : (user?.avatar || 'BK')"],
    // roleInfo emoji in profile role text
    ["{roleInfo ? `${roleInfo.emoji} ${roleInfo.label}` : 'Guest'}",
     "{roleInfo ? roleInfo.label : 'Guest'}"],
    // roleInfo emoji in user menu badge
    ["{roleInfo?.emoji} {roleInfo?.label}",
     "{roleInfo?.label}"],
]);

// ──────────────────────────────────────────────────────────────
// 3. DashboardPage.jsx — stat card icons
// ──────────────────────────────────────────────────────────────
replaceInFile(path.join(root, 'sections/dashboard/DashboardPage.jsx'), [
    // Stat icons replaced to SVG components via string
    ["icon: '🔄', color: '#4A7C28'",
     "icon: <svg width='20' height='20' fill='none' viewBox='0 0 24 24'><path d='M23 4v6h-6M1 20v-6h6' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/><path d='M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg>, color: '#4A7C28'"],
    ["icon: '☕', color: '#F5A623'",
     "icon: <svg width='20' height='20' fill='none' viewBox='0 0 24 24'><path d='M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg>, color: '#F5A623'"],
    ["icon: '👩‍🌾', color: '#00D4FF'",
     "icon: <svg width='20' height='20' fill='none' viewBox='0 0 24 24'><path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/><circle cx='9' cy='7' r='4' stroke='currentColor' strokeWidth='2'/><path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg>, color: '#00D4FF'"],
    ["icon: '💰', color: '#4CAF50'",
     "icon: <svg width='20' height='20' fill='none' viewBox='0 0 24 24'><path d='M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg>, color: '#4CAF50'"],
    // Use JSX icon in the stat card render
    ["<span style={{ fontSize: 20 }}>{stat.icon}</span>",
     "<span style={{display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-text-muted)'}}>{stat.icon}</span>"],
    // Dashboard subtitle phantom
    ["{walletPublicKey ? `👻 Phantom: ${walletPublicKey.slice(0, 8)}...${walletPublicKey.slice(-6)} • ` : ''}",
     "{walletPublicKey ? `Phantom: ${walletPublicKey.slice(0, 8)}...${walletPublicKey.slice(-6)} • ` : ''}"],
    // Dashboard Riwayat Pembelian card title
    ["<h3 className={styles.cardTitle}>🛍️ Riwayat Pembelian Produk Kopi</h3>",
     "<h3 className={styles.cardTitle}>Riwayat Pembelian Produk Kopi</h3>"],
    // payment method icons in table
    ["o.paymentMethod === 'qris' ? '📱 QRIS' : '👻 Phantom'",
     "o.paymentMethod === 'qris' ? 'QRIS' : 'Phantom'"],
    // ✅ LUNAS badge
    ["<span className={`${styles.badge} ${styles.badgecompleted}`}>✅ LUNAS</span>",
     "<span className={`${styles.badge} ${styles.badgecompleted}`}>LUNAS</span>"],
    // delete button
    ["<button className={styles.deleteBtn} onClick={() => handleDeleteTx(tx.id)} title=\"Hapus\">✕</button>",
     "<button className={styles.deleteBtn} onClick={() => handleDeleteTx(tx.id)} title=\"Hapus\"><svg width='12' height='12' fill='none' viewBox='0 0 24 24'><path d='M18 6L6 18M6 6l12 12' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg></button>"],
]);

// ──────────────────────────────────────────────────────────────
// 4. Sidebar.jsx — role badge emoji
// ──────────────────────────────────────────────────────────────
replaceInFile(path.join(root, 'components/Sidebar/Sidebar.jsx'), [
    // Role badge icon — replace emoji span with initial letters
    ["<span>{roleInfo.emoji}</span>",
     "<span style={{fontWeight:700,fontSize:13,lineHeight:1}}>{user.name.substring(0,2).toUpperCase()}</span>"],
    // Logo: keep coffee SVG but remove the yellow #F5A623 color (make it monochrome)
    ['stroke="#F5A623"', 'stroke="currentColor"'],
    ['fill="#F5A623"', 'fill="currentColor"'],
    ['fill="#4A7C28"', 'fill="currentColor"'],
    ['stroke="#4A7C28"', 'stroke="currentColor"'],
]);

// ──────────────────────────────────────────────────────────────
// 5. Login & Register pages — remove emoji from buttons/labels
// ──────────────────────────────────────────────────────────────
const loginFile = path.join(root, 'sections/login/LoginPage.jsx');
if (fs.existsSync(loginFile)) {
    let c = fs.readFileSync(loginFile, 'utf8');
    c = c.replace(/🌱|🏘️|🛠️|☕|🔑|👻|📧|🌙|☀️|⚠️|✅|❌|⏳/g, '');
    fs.writeFileSync(loginFile, c, 'utf8');
    console.log('Cleaned emojis from LoginPage');
}

const registerFile = path.join(root, 'sections/register/RegisterPage.jsx');
if (fs.existsSync(registerFile)) {
    let c = fs.readFileSync(registerFile, 'utf8');
    c = c.replace(/🌱|🏘️|🛠️|☕|🔑|👻|📧|🌙|☀️|⚠️|✅|❌|⏳/g, '');
    fs.writeFileSync(registerFile, c, 'utf8');
    console.log('Cleaned emojis from RegisterPage');
}

console.log('\nAll done!');
