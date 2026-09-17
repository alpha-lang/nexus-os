const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
const q=await p.storageQuota.findMany({
  include:{organization:{select:{name:true,type:true}}}
});
console.log('\n══ StorageQuota en BDD ══\n');
for(const row of q){
  console.log(`  ${(row.organization?.name||'?').padEnd(20)} usedStorage=${row.usedStorage}  max=${row.maxStorage}  lastBackup=${row.lastBackup?.toISOString()||'—'}`);
}
await p.$disconnect();
})();
