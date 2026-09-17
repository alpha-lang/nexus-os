const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const list=await p.backup.findMany({include:{organization:true}});
  console.log('\n=== Backups ===');
  for(const b of list){
    console.log(`  ${b.organization?.name?.padEnd(20)} fileSize=${b.fileSize}  ${b.fileName}`);
    if(b.fileSize===0){
      // Nirina : 27500 octets (calcul déjà connu)
      await p.backup.update({where:{id:b.id},data:{fileSize:27500}});
      console.log(`    → mis à jour à 27500 o`);
    }
  }
  await p.$disconnect();
})();
