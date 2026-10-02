import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * ═══════════════════════════════════════════════════════════════
 *  NEXUS OS — SEED MINIMAL MULTI-TENANT
 * ═══════════════════════════════════════════════════════════════
 *
 * Crée :
 *   1. NEXUS CORP (organisation interne)
 *   2. admin@nexus.com (SUPER_ADMIN owner)
 *   3. Catalogue COMPLET de modules (actifs + à venir)
 *
 * Modules ACTIVE = frontend prêt, vendables
 * Modules INACTIVE = à développer (visibles en admin, non vendables)
 *
 * Aucune donnée client. Les orgs se créent via /dashboard/organizations.
 * Idempotent.
 * ═══════════════════════════════════════════════════════════════
 */
async function main() {
  console.log('🌱 Seed NEXUS OS...\n');

  // ─── 1. Organisation interne ───
  const nexusCorp = await prisma.organization.upsert({
    where: { slug: 'nexus-corp' },
    update: {},
    create: {
      name: 'NEXUS CORP',
      slug: 'nexus-corp',
      type: 'INTERNE',
      status: 'ACTIVE',
      city: 'Antananarivo',
    },
  });
  console.log('✅ NEXUS CORP');

  // ─── 2. StorageQuota ───
  await prisma.storageQuota.upsert({
    where: { organizationId: nexusCorp.id },
    update: {},
    create: {
      organizationId: nexusCorp.id,
      usedStorage: 0,
      maxStorage: 10000,
    },
  });
  console.log('✅ StorageQuota');

  // ─── 3. Super Admin ───
  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@nexus.com' },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: 'admin@nexus.com',
        password: await bcrypt.hash('Admin123!', 10),
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        isOwner: true,
        isActive: true,
        organizationId: nexusCorp.id,
      },
    });
    console.log('✅ Admin : admin@nexus.com / Admin123!');
  } else {
    console.log('✅ Admin existe déjà');
  }

  // ─── 4. Catalogue complet de modules ───
  const ALL = 'COMMERCE,HOTEL,ONG,MICROFINANCE,BANQUE,ECOLE,CLINIQUE,RESTAURANT';

  const MODULES: Array<{
    name: string; route: string; price: number; types: string;
    status: 'ACTIVE' | 'INACTIVE';
  }> = [
    // ══════ TRANSVERSE ══════
    { name: 'CRM',           route: '/dashboard/crm',              price:     0, types: ALL,                                       status: 'ACTIVE' },
    { name: 'Caisse',        route: '/dashboard/caisse',           price: 30000, types: ALL,                                       status: 'ACTIVE' },
    { name: 'Stock',         route: '/dashboard/stock',            price: 45000, types: 'COMMERCE,HOTEL,RESTAURANT',               status: 'ACTIVE' },
    { name: 'Facturation',   route: '/dashboard/facturation',      price: 20000, types: ALL,                                       status: 'INACTIVE' },
    { name: 'RH',            route: '/dashboard/rh',               price: 25000, types: ALL,                                       status: 'INACTIVE' },
    { name: 'Documents',     route: '/dashboard/documents',        price: 15000, types: ALL,                                       status: 'INACTIVE' },

    // ══════ HÔTEL ══════
    { name: 'Réservation',   route: '/dashboard/reservations',                    price: 25000, types: 'HOTEL', status: 'ACTIVE' },
    { name: 'Housekeeping',  route: '/dashboard/reservations/housekeeping',       price: 15000, types: 'HOTEL', status: 'ACTIVE' },
    { name: 'Night Audit',   route: '/dashboard/reservations/night-audit',        price: 15000, types: 'HOTEL', status: 'ACTIVE' },
    { name: 'Restaurant',    route: '/dashboard/caisse/pos',                      price: 20000, types: 'HOTEL,RESTAURANT', status: 'ACTIVE' },
    { name: 'Spa',           route: '/dashboard/spa',                             price: 20000, types: 'HOTEL', status: 'INACTIVE' },

    // ══════ COMMERCE ══════
    { name: 'Ventes',        route: '/dashboard/sales',            price: 20000, types: 'COMMERCE', status: 'ACTIVE' },
    { name: 'Catalogue',     route: '/dashboard/catalogue',        price: 10000, types: 'COMMERCE', status: 'INACTIVE' },
    { name: 'E-commerce',    route: '/dashboard/ecommerce',        price: 30000, types: 'COMMERCE', status: 'INACTIVE' },

    // ══════ ÉCOLE ══════
    { name: 'Élèves',          route: '/dashboard/eleves',           price: 25000, types: 'ECOLE', status: 'INACTIVE' },
    { name: 'Classes & Niveaux', route: '/dashboard/classes',        price: 20000, types: 'ECOLE', status: 'INACTIVE' },
    { name: 'Notes & Bulletins', route: '/dashboard/notes',          price: 25000, types: 'ECOLE', status: 'INACTIVE' },
    { name: 'Emploi du temps', route: '/dashboard/emploi-du-temps',  price: 15000, types: 'ECOLE', status: 'INACTIVE' },
    { name: 'Présences',       route: '/dashboard/presences',        price: 15000, types: 'ECOLE', status: 'INACTIVE' },
    { name: 'Scolarité',       route: '/dashboard/scolarite',        price: 25000, types: 'ECOLE', status: 'INACTIVE' },
    { name: 'Bibliothèque',    route: '/dashboard/bibliotheque',     price: 20000, types: 'ECOLE', status: 'INACTIVE' },
    { name: 'Cantine',         route: '/dashboard/cantine',          price: 15000, types: 'ECOLE', status: 'INACTIVE' },

    // ══════ ONG ══════
    { name: 'Bénéficiaires',   route: '/dashboard/beneficiaires',    price: 25000, types: 'ONG', status: 'INACTIVE' },
    { name: 'Projets',         route: '/dashboard/projets',          price: 30000, types: 'ONG', status: 'INACTIVE' },
    { name: 'Dons & Financements', route: '/dashboard/dons',         price: 25000, types: 'ONG', status: 'INACTIVE' },
    { name: 'Activités terrain', route: '/dashboard/activites',      price: 20000, types: 'ONG', status: 'INACTIVE' },

    // ══════ MICROFINANCE ══════
    { name: 'Emprunteurs',     route: '/dashboard/emprunteurs',      price: 30000, types: 'MICROFINANCE', status: 'INACTIVE' },
    { name: 'Crédits & Prêts', route: '/dashboard/credits',          price: 40000, types: 'MICROFINANCE', status: 'INACTIVE' },
    { name: 'Épargne',         route: '/dashboard/epargne',          price: 25000, types: 'MICROFINANCE', status: 'INACTIVE' },
    { name: 'Recouvrement',    route: '/dashboard/recouvrement',     price: 30000, types: 'MICROFINANCE', status: 'INACTIVE' },

    // ══════ BANQUE ══════
    { name: 'Comptes',         route: '/dashboard/comptes',          price: 40000, types: 'BANQUE', status: 'INACTIVE' },
    { name: 'Transactions',    route: '/dashboard/transactions',     price: 35000, types: 'BANQUE', status: 'INACTIVE' },
    { name: 'Crédits',         route: '/dashboard/credits-bancaires', price: 45000, types: 'BANQUE', status: 'INACTIVE' },
    { name: 'KYC & Conformité', route: '/dashboard/kyc',             price: 50000, types: 'BANQUE', status: 'INACTIVE' },

    // ══════ CLINIQUE ══════
    { name: 'Patients',        route: '/dashboard/patients',         price: 30000, types: 'CLINIQUE', status: 'INACTIVE' },
    { name: 'Rendez-vous',     route: '/dashboard/rdv',              price: 25000, types: 'CLINIQUE', status: 'INACTIVE' },
    { name: 'Dossiers médicaux', route: '/dashboard/dossiers',       price: 30000, types: 'CLINIQUE', status: 'INACTIVE' },
    { name: 'Pharmacie',       route: '/dashboard/pharmacie',        price: 30000, types: 'CLINIQUE', status: 'INACTIVE' },

    // ══════ RESTAURANT ══════
    { name: 'Plan de salle',   route: '/dashboard/caisse/tables',    price: 20000, types: 'RESTAURANT', status: 'ACTIVE' },
    { name: 'Livraison',       route: '/dashboard/livraison',        price: 20000, types: 'RESTAURANT', status: 'INACTIVE' },
  ];

  let created = 0;
  let existing = 0;
  for (const m of MODULES) {
    // Détection par ROUTE (stable, unique, sans accents)
    // → évite les doublons si on renomme un module avec/sans accents
    const exists = await prisma.module.findFirst({
      where: { route: m.route, organizationId: nexusCorp.id },
    });
    if (!exists) {
      await prisma.module.create({
        data: {
          name: m.name,
          route: m.route,
          price: m.price,
          types: m.types,
          status: m.status,
          organizationId: nexusCorp.id,
        },
      });
      created++;
    } else {
      // Mettre à jour name + types + status (permet de renommer sans doublon)
      await prisma.module.update({
        where: { id: exists.id },
        data: { name: m.name, types: m.types, status: m.status, price: m.price },
      });
      existing++;
    }
  }

  const actives = MODULES.filter(m => m.status === 'ACTIVE').length;
  const inactives = MODULES.filter(m => m.status === 'INACTIVE').length;

  console.log(`✅ Modules : ${created} créés, ${existing} mis à jour`);
  console.log(`   ${actives} ACTIFS (vendables) / ${inactives} À VENIR`);

  console.log('\n✨ SEED TERMINÉ');
  console.log('   Login : admin@nexus.com / Admin123!\n');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
