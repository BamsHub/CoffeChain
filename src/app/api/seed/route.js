export const runtime = 'edge';
import { addItem } from '@/lib/db';

export async function GET() {
    try {
        const dummy = {
            id: 'prod-dummy01',
            name: 'Arabika Gayo Specialty',
            origin: 'Aceh Tengah',
            variety: 'Arabika',
            grade: 'Specialty',
            roast: 'Medium Roast',
            description: 'Kopi arabika premium dari dataran tinggi Gayo, Aceh. Proses natural, catatan rasa cokelat gelap, karamel, dan buah tropis. Ketinggian 1.400–1.700 mdpl.',
            weight: [250, 500, 1000],
            pricePerUnit: [85000, 160000, 300000],
            tags: ['Arabika', 'Specialty', 'Natural'],
            stock: 100,
            rating: 4.8,
            sold: 0,
            image: null,
        };
        await addItem('products', dummy);
        return Response.json({ success: true, message: 'Dummy product berhasil ditambahkan!', data: dummy });
    } catch (e) {
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}
