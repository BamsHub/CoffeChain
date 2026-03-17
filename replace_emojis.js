const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/sections/profile/ProfilePage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Tambahkan Import
if (!content.includes('lucide-react')) {
    content = content.replace(
        "import styles from './ProfilePage.module.css';",
        "import styles from './ProfilePage.module.css';\nimport { Key, Shield, Wallet, MonitorSmartphone, User, Lock, Bell, Settings, ShoppingBag, CreditCard, TrendingUp, Link as LinkIcon, Mail, Moon, Sun, Camera, Upload, Trash2, Save, Loader2, Link2, Unplug, AlertTriangle, CheckCircle2, Calendar, Banknote, Sparkles, X, LogOut, Check, ChevronLeft } from 'lucide-react';"
    );
}

// 2. Modals Header & content
content = content.replace(/<span>🔑 Ubah Password<\/span>/g, '<span style={{display:"flex",alignItems:"center",gap:6}}><Key size={18} /> Ubah Password</span>');
content = content.replace(/<span>👻 Kelola Phantom Wallet<\/span>/g, '<span style={{display:"flex",alignItems:"center",gap:6}}><Wallet size={18} /> Kelola Phantom Wallet</span>');
content = content.replace(/<div style={{ fontSize: 48 }}>👻<\/div>/g, '<div style={{ display:"flex", alignItems:"center", justifyContent:"center", color: "var(--color-text-muted)" }}><Wallet size={48} strokeWidth={1} /></div>');

// 3. TABS
content = content.replace(/icon: '👤'/g, "icon: <User size={16} />");
content = content.replace(/icon: '🔐'/g, "icon: <Lock size={16} />");
content = content.replace(/icon: '🔔'/g, "icon: <Bell size={16} />");
content = content.replace(/icon: '⚙️'/g, "icon: <Settings size={16} />");

// 4. Notifications
content = content.replace(/icon: '🛍️'/g, "icon: <ShoppingBag size={20} />");
content = content.replace(/icon: '💳'/g, "icon: <CreditCard size={20} />");
content = content.replace(/icon: '📈'/g, "icon: <TrendingUp size={20} />");
content = content.replace(/icon: '🤝'/g, "icon: <LinkIcon size={20} />");
content = content.replace(/icon: '📧'/g, "icon: <Mail size={20} />");

// 5. Security Cards
content = content.replace(/<div className={styles.secIcon}>🔑<\/div>/g, '<div className={styles.secIcon}><Key size={24} strokeWidth={1.5} /></div>');
content = content.replace(/<div className={styles.secIcon}>🛡️<\/div>/g, '<div className={styles.secIcon}><Shield size={24} strokeWidth={1.5} /></div>');
content = content.replace(/<div className={styles.secIcon}>👻<\/div>/g, '<div className={styles.secIcon}><Wallet size={24} strokeWidth={1.5} /></div>');
content = content.replace(/<div className={styles.secIcon}>📋<\/div>/g, '<div className={styles.secIcon}><MonitorSmartphone size={24} strokeWidth={1.5} /></div>');

// 6. Theme Toggle & avatar
content = content.replace(/'🌙' : '☀️'/g, 'isDark ? <Moon size={16} /> : <Sun size={16} />');
content = content.replace(/📷 Ganti Foto/g, '<Camera size={14} style={{marginRight:4, verticalAlign:"middle"}}/> Ganti Foto');
content = content.replace(/<span>👻<\/span>/g, '<span><Wallet size={14} /></span>');
content = content.replace(/🗓️ Member sejak/g, '<Calendar size={14} style={{verticalAlign:"middle", marginRight:4}}/> Member sejak');

// 7. Preferences
content = content.replace(/🌙 Tema Gelap/g, 'Tema Gelap');
content = content.replace(/☀️ Tema Terang/g, 'Tema Terang');
content = content.replace(/{isDark \? 'Tema Gelap' : 'Tema Terang'}/g, '{isDark ? <span style={{display:"flex",alignItems:"center",gap:6}}><Moon size={16}/> Tema Gelap</span> : <span style={{display:"flex",alignItems:"center",gap:6}}><Sun size={16}/> Tema Terang</span>}');
content = content.replace(/💱 Format Mata Uang IDR/g, '<span style={{display:"flex",alignItems:"center",gap:6}}><Banknote size={16}/> Format Mata Uang IDR</span>');
content = content.replace(/✨ Animasi UI/g, '<span style={{display:"flex",alignItems:"center",gap:6}}><Sparkles size={16}/> Animasi UI</span>');

// 8. Buttons
content = content.replace(/'⏳ Mengubah...' : '🔑 Ubah Password'/g, "loading ? <span style={{display:'flex',gap:6,alignItems:'center',justifyContent:'center'}}><Loader2 size={16} className={styles.spin} /> Mengubah...</span> : <span style={{display:'flex',gap:6,alignItems:'center',justifyContent:'center'}}><Key size={16} /> Ubah Password</span>");
content = content.replace(/'⏳ Menghubungkan...' : '🔗 Hubungkan Wallet'/g, "connecting ? <span style={{display:'flex',gap:6,alignItems:'center',justifyContent:'center'}}><Loader2 size={16} className={styles.spin} /> Menghubungkan...</span> : <span style={{display:'flex',gap:6,alignItems:'center',justifyContent:'center'}}><Link2 size={16} /> Hubungkan Wallet</span>");
content = content.replace(/✂️ Putuskan/g, '<span style={{display:"flex",alignItems:"center",gap:6}}><Unplug size={16}/> Putuskan</span>');
content = content.replace(/📁 Upload Foto/g, '<span style={{display:"flex",alignItems:"center",gap:6}}><Upload size={16}/> Upload Foto</span>');
content = content.replace(/🗑️ Hapus/g, '<span style={{display:"flex",alignItems:"center",gap:6}}><Trash2 size={16}/> Hapus</span>');
content = content.replace(/← Kembali/g, '<span style={{display:"flex",alignItems:"center",gap:6}}><ChevronLeft size={16}/> Kembali</span>');
content = content.replace(/'⏳ Menyimpan...' : '💾 Simpan Perubahan'/g, "saving ? <span style={{display:'flex',gap:6,alignItems:'center',justifyContent:'center'}}><Loader2 size={16} className={styles.spin} /> Menyimpan...</span> : <span style={{display:'flex',gap:6,alignItems:'center',justifyContent:'center'}}><Save size={16} /> Simpan Perubahan</span>");
content = content.replace(/'⏳ Menyimpan...' : '💾 Simpan Preferensi'/g, "saving ? <span style={{display:'flex',gap:6,alignItems:'center',justifyContent:'center'}}><Loader2 size={16} className={styles.spin} /> Menyimpan...</span> : <span style={{display:'flex',gap:6,alignItems:'center',justifyContent:'center'}}><Save size={16} /> Simpan Preferensi</span>");
content = content.replace(/💾 Simpan Preferensi Notifikasi/g, '<span style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}><Save size={16}/> Simpan Preferensi Notifikasi</span>');

// 9. Alerts
content = content.replace(/⚠️ /g, '');
content = content.replace(/✅ /g, '');
content = content.replace(/❌ /g, '');
content = content.replace(/<div className={styles.errorBox}>/g, '<div className={styles.errorBox} style={{display:"flex",alignItems:"center",gap:8}}><AlertTriangle size={16} /> ');
content = content.replace(/<div className={msg\.includes\('✅'\) \? styles\.successBox : styles\.errorBox}>{msg}<\/div>/g, '<div className={msg.includes("Terhubung") || msg.includes("berhasil") ? styles.successBox : styles.errorBox} style={{display:"flex",alignItems:"center",gap:8}}>{msg.includes("Terhubung") || msg.includes("berhasil") ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>} {msg}</div>');
content = content.replace(/<div className={styles.successBox}>/g, '<div className={styles.successBox} style={{display:"flex",alignItems:"center",gap:8}}><CheckCircle2 size={16} /> ');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replacing emojis with Lucide Icons done!');
