/* eslint-disable no-console */
import { PrismaClient, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();
const slug = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 7);

const DEMO_EMAIL = 'demo@linklytics.dev';
const DEMO_PASSWORD = 'demopassword123';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, passwordHash },
  });

  // Reset demo links so re-seeding is idempotent.
  await prisma.link.deleteMany({ where: { userId: user.id } });

  const targets = ['https://nestjs.com', 'https://nextjs.org', 'https://kubernetes.io'];
  const referrers = ['https://twitter.com', 'https://news.ycombinator.com', null];
  const countries = ['US', 'PE', 'DE', 'JP', 'BR'];

  for (const url of targets) {
    const link = await prisma.link.create({
      data: { slug: slug(), originalUrl: url, userId: user.id },
    });

    const clickCount = 20 + Math.floor(Math.random() * 60);
    const events: Prisma.ClickEventCreateManyInput[] = Array.from({ length: clickCount }).map(
      () => ({
        linkId: link.id,
        occurredAt: new Date(Date.now() - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000),
        referrer: referrers[Math.floor(Math.random() * referrers.length)],
        country: countries[Math.floor(Math.random() * countries.length)],
      }),
    );

    await prisma.clickEvent.createMany({ data: events });
    await prisma.link.update({ where: { id: link.id }, data: { clickCount } });
    console.log(`Seeded ${url} -> /r/${link.slug} (${clickCount} clicks)`);
  }

  console.log(`\nDemo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
