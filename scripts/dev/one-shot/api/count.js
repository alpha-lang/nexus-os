const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
const org=await p.organization.findFirst({where:{name:{contains:'Nirina',mode:'insensitive'}}});
if(!org){console.log('❌ Nirina introuvable');const a=await p.organization.findMany({select:{name:true,type:true}});a.forEach(o=>console.log(' -',o.name,'('+o.type+')'));return;}
const id=org.id;
console.log('\n═══ '+org.name+' ('+org.type+') ═══\n');
const t=[
['Users',p.user.count({where:{organizationId:id}})],
['Customers',p.customer.count({where:{organizationId:id}})],
['Modules',p.module.count({where:{organizationId:id}})],
['Subscriptions',p.subscription.count({where:{organizationId:id}})],
['Payments',p.payment.count({where:{organizationId:id}})],
['RoomTypes',p.roomType.count({where:{organizationId:id}})],
['Rooms',p.room.count({where:{organizationId:id}})],
['Reservations',p.reservation.count({where:{organizationId:id}})],
['Housekeeping',p.housekeepingTask.count({where:{organizationId:id}})],
['FolioCharges',p.folioCharge.count({where:{organizationId:id}})],
['MenuItems',p.menuItem.count({where:{organizationId:id}})],
['Tables',p.table.count({where:{organizationId:id}})],
['Orders',p.restaurantOrder.count({where:{organizationId:id}})],
['OrderItems',p.restaurantOrderItem.count({where:{order:{organizationId:id}}})],
['OrderPayments',p.orderPayment.count({where:{order:{organizationId:id}}})],
['PosSales(legacy)',p.posSale.count({where:{organizationId:id}})],
['PosSaleItems',p.posSaleItem.count({where:{sale:{organizationId:id}}})],
['CashRegisters',p.cashRegister.count({where:{organizationId:id}})],
['CashMovements',p.cashMovement.count({where:{organizationId:id}})],
['CashSessions',p.cashSession.count({where:{organizationId:id}})],
['Sales',p.sale.count({where:{organizationId:id}})],
['CatalogItems',p.catalogItem.count({where:{organizationId:id}})],
['Backups',p.backup.count({where:{organizationId:id}})],
];
for(const[k,v]of t){try{console.log(k.padEnd(20),await v);}catch(e){console.log(k.padEnd(20),'ERR');}}
const q=await p.storageQuota.findUnique({where:{organizationId:id}});
if(q)console.log('\nStorage:',q.usedStorage+'/'+q.maxStorage+' Mo');
await p.$disconnect();
})();
