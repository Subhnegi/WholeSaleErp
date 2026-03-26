import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create initial meta record for version info
  await prisma.meta.upsert({
    where: { key: 'app_version' },
    update: {},
    create: {
      key: 'app_version',
      value: '1.0.0',
    },
  })

  await prisma.meta.upsert({
    where: { key: 'db_version' },
    update: {},
    create: {
      key: 'db_version',
      value: '1.0.0',
    },
  })

  await prisma.meta.upsert({
    where: { key: 'setup_status' },
    update: {},
    create: {
      key: 'setup_status',
      value: 'phase_1_complete',
    },
  })

  console.log('✅ Database seeded successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
