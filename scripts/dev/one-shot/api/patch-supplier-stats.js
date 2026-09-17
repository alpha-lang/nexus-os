const fs = require('fs');
const p = 'src/customers/customers.service.ts';
let s = fs.readFileSync(p, 'utf8');

// Trouver findFullPartner (déjà un peu patché) et ajouter stats fournisseur
const old = `    const totalReservations = reservations.length;
    const totalSales = sales.length;
    const totalSpent =
      reservations.reduce((s, r) => s + (r.totalAmount || 0), 0) +
      sales.reduce((s, x) => s + (x.total || 0), 0) +
      posSales.reduce((s, x) => s + (x.total || 0), 0);
    const totalPaid = reservations.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const lastVisit = reservations[0]?.checkOutDate || reservations[0]?.checkInDate || null;`;

const neu = `    // Stats fournisseur (si applicable)
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      include: { items: { include: { stockItem: { select: { name: true, unit: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const stockItems = await this.prisma.stockItem.findMany({
      where: { supplierId: id },
      select: { id: true, name: true, sku: true, unit: true, currentStock: true, minStock: true, costPrice: true },
    });

    const totalOrders = purchaseOrders.length;
    const totalPurchases = purchaseOrders
      .filter(o => o.status === 'RECEIVED' || o.status === 'PARTIAL')
      .reduce((s, o) => s + (o.totalAmount || 0), 0);
    const pendingOrders = purchaseOrders.filter(o => o.status === 'SENT' || o.status === 'PARTIAL').length;
    const lastOrderAt = purchaseOrders[0]?.createdAt || null;

    const totalReservations = reservations.length;
    const totalSales = sales.length;
    const totalSpent =
      reservations.reduce((s, r) => s + (r.totalAmount || 0), 0) +
      sales.reduce((s, x) => s + (x.total || 0), 0) +
      posSales.reduce((s, x) => s + (x.total || 0), 0);
    const totalPaid = reservations.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const lastVisit = reservations[0]?.checkOutDate || reservations[0]?.checkInDate || null;`;

if (!s.includes(old)) { console.error('❌ anchor stats introuvable'); process.exit(1); }
s = s.replace(old, neu);

// Enrichir le return
const oldReturn = `    return {
      ...partner,
      reservations,
      sales,
      posSales,
      timeline,
      stats: {
        totalReservations,
        totalSales,
        totalSpent,
        totalPaid,
        outstanding: totalSpent - totalPaid,
        lastVisit,
      },
    };`;

const newReturn = `    return {
      ...partner,
      reservations,
      sales,
      posSales,
      purchaseOrders,
      stockItems,
      timeline,
      stats: {
        // Client
        totalReservations,
        totalSales,
        totalSpent,
        totalPaid,
        outstanding: totalSpent - totalPaid,
        lastVisit,
        // Fournisseur
        totalOrders,
        totalPurchases,
        pendingOrders,
        lastOrderAt,
        totalStockItems: stockItems.length,
      },
    };`;

if (!s.includes(oldReturn)) { console.error('❌ anchor return introuvable'); process.exit(1); }
s = s.replace(oldReturn, newReturn);

fs.writeFileSync(p, s);
console.log('✅ findFullPartner enrichi (stats fournisseur)');
